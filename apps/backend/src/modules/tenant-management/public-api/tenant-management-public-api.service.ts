import type { LocalDate } from '@repo/api-contracts';
import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { localDateDayOfWeek, localDateToPrismaDate, prismaDateToLocalDate } from 'src/core/temporal/local-date';
import {
  BranchUnavailableForRentalError,
  PickupTimeOutsideBranchScheduleError,
  ProfessionalConfirmedRentalCreationDisabledError,
  RentalCommitmentError,
  RentalCustomerUnavailableForRentalError,
  ReturnTimeOutsideBranchScheduleError,
  TenantUnavailableForRentalError,
  UnsupportedBranchFulfillmentMethodError,
} from 'src/modules/rental-commitment/domain/errors/rental-commitment.errors';
import { FulfillmentMethod } from 'src/modules/rental-commitment/domain/rental-status';

import {
  BranchContext,
  TenantContext,
  GetBranchContextInput,
  GetBranchContextsInput,
  GetRentalBudgetDocumentContextInput,
  GetRentalCustomerNotificationRecipientInput,
  GetTenantAdminNotificationRecipientsInput,
  GetTenantConfigInput,
  GetTenantConfigResult,
  GetTenantInput,
  GetTenantPricingConfigInput,
  GetTenantPricingConfigResult,
  RentalBudgetDocumentContext,
  RentalCustomerNotificationRecipient,
  TenantAdminNotificationRecipient,
  TenantManagementPublicApi,
  TenantManagementPublicApiError,
  ValidateCustomerForStaffDraftRentalInput,
  ValidateCustomerForStaffDraftRentalResult,
  ValidateDraftRentalInput,
  ValidateDraftRentalResult,
  ValidateOfferingSetupError,
  ValidateOfferingSetupInput,
  ValidateProfessionalConfirmedRentalCreationInput,
  ValidateProfessionalConfirmedRentalCreationResult,
  ValidateWhatsAppStylePendingRentalInput,
} from './tenant-management.public-api';
import { TenantBookingMode, TenantConfig, TenantConfigProps } from '../domain/value-objects/tenant-config.value-object';
import { BranchScheduleWindow } from '../domain/value-objects/branch-schedule-window.value-object';
import { resolveEffectiveTimezone } from '../domain/utils/effective-timezone';

type LocalDateTimeParts = {
  dateKey: LocalDate;
  dayOfWeek: number;
  minuteOfDay: number;
};

type BranchScheduleSlotType = 'PICKUP' | 'RETURN';

const DEFAULT_MINIMUM_CHARGED_DAYS = 1;
const DEFAULT_HALF_DAY_THRESHOLD_MINUTES = 720;

function tenantManagementPublicApiError(
  code: TenantManagementPublicApiError['code'],
  message: string,
  cause?: unknown,
): TenantManagementPublicApiError {
  return { code, message, cause };
}

@Injectable()
export class TenantManagementPublicApiService extends TenantManagementPublicApi {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async validateWhatsAppStylePendingRental(
    _input: ValidateWhatsAppStylePendingRentalInput,
  ): Promise<Result<void, RentalCommitmentError>> {
    return ok(undefined);
  }

  async validateCustomerForStaffDraftRental(
    input: ValidateCustomerForStaffDraftRentalInput,
  ): Promise<ValidateCustomerForStaffDraftRentalResult> {
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: { id: input.customerId, tenantId: input.tenantId },
      select: { deletedAt: true, isActive: true },
    });

    if (!customer) {
      return { eligible: false, reason: 'CustomerNotFoundOrOutsideTenant' };
    }

    if (customer.deletedAt) {
      return { eligible: false, reason: 'CustomerDeleted' };
    }

    if (!customer.isActive) {
      return { eligible: false, reason: 'CustomerInactive' };
    }

    return { eligible: true };
  }

  async validateDraftRental(
    input: ValidateDraftRentalInput,
  ): Promise<Result<ValidateDraftRentalResult, RentalCommitmentError>> {
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: { id: input.tenantId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, config: true },
    });

    if (!tenant) {
      return err(new TenantUnavailableForRentalError(input.tenantId));
    }

    const tenantConfig = this.reconstituteTenantConfig(tenant.config);
    if (!tenantConfig) {
      return err(new TenantUnavailableForRentalError(input.tenantId));
    }

    const branch = await this.prisma.client.v2Branch.findFirst({
      where: {
        id: input.branchId,
        tenantId: input.tenantId,
        isActive: true,
      },
      select: {
        id: true,
        timezone: true,
        supportsDelivery: true,
      },
    });

    if (!branch) {
      return err(new BranchUnavailableForRentalError(input.branchId));
    }

    if (input.fulfillmentMethod === FulfillmentMethod.Delivery && !branch.supportsDelivery) {
      return err(new UnsupportedBranchFulfillmentMethodError(input.branchId, input.fulfillmentMethod));
    }

    if (input.rentalCustomerId) {
      const rentalCustomer = await this.prisma.client.v2RentalCustomer.findFirst({
        where: {
          id: input.rentalCustomerId,
          tenantId: input.tenantId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!rentalCustomer) {
        return err(new RentalCustomerUnavailableForRentalError(input.rentalCustomerId));
      }
    }

    const timezone = resolveEffectiveTimezone(branch.timezone, tenantConfig.timezone);

    return ok({
      pricingConfig: {
        timezone,
        dailyBillingPolicy: tenantConfig.pricing.roundingRule,
        minimumChargedDays: DEFAULT_MINIMUM_CHARGED_DAYS,
        halfDayThresholdMinutes:
          tenantConfig.pricing.roundingRule === 'BILL_OVER_HALF_DAY' ? DEFAULT_HALF_DAY_THRESHOLD_MINUTES : undefined,
      },
    });
  }

  async validateOfferingSetup(input: ValidateOfferingSetupInput): Promise<Result<void, ValidateOfferingSetupError>> {
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: { id: input.tenantId, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });

    if (!tenant) {
      const cause = new TenantUnavailableForRentalError(input.tenantId);
      return err({
        code: 'TenantUnavailable',
        message: cause.message,
        cause,
        context: { tenantId: input.tenantId },
      });
    }

    const branchIds = [...new Set(input.branchIds)];
    if (branchIds.length === 0) {
      return ok(undefined);
    }

    const activeBranches = await this.prisma.client.v2Branch.findMany({
      where: {
        id: { in: branchIds },
        tenantId: input.tenantId,
        isActive: true,
      },
      select: { id: true },
    });

    const activeBranchIds = new Set(activeBranches.map((branch) => branch.id));
    const unavailableBranchId = branchIds.find((branchId) => !activeBranchIds.has(branchId));

    if (unavailableBranchId) {
      const cause = new BranchUnavailableForRentalError(unavailableBranchId);
      return err({
        code: 'BranchUnavailable',
        message: cause.message,
        cause,
        context: { branchId: unavailableBranchId },
      });
    }

    return ok(undefined);
  }

  async getTenant(input: GetTenantInput): Promise<Result<TenantContext, TenantManagementPublicApiError>> {
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: { id: input.tenantId, status: 'ACTIVE', deletedAt: null },
      select: {
        id: true,
        slug: true,
        name: true,
        branding: {
          select: {
            logoUrl: true,
            faviconUrl: true,
            primaryColor: true,
          },
        },
        domains: {
          where: {
            isPrimary: true,
            status: 'VERIFIED',
            verifiedAt: { not: null },
            deletedAt: null,
          },
          select: { domain: true },
          take: 1,
        },
      },
    });

    if (!tenant) {
      return err(tenantManagementPublicApiError('TenantNotFound', `Tenant "${input.tenantId}" was not found.`));
    }

    return ok({
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      customDomain: tenant.domains[0]?.domain ?? null,
      logoUrl: tenant.branding?.logoUrl ?? null,
      faviconUrl: tenant.branding?.faviconUrl ?? null,
      primaryColor: tenant.branding?.primaryColor ?? null,
    });
  }

  async getTenantConfig(
    input: GetTenantConfigInput,
  ): Promise<Result<GetTenantConfigResult, TenantManagementPublicApiError>> {
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: { id: input.tenantId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, config: true },
    });

    if (!tenant) {
      return err(tenantManagementPublicApiError('TenantNotFound', `Tenant "${input.tenantId}" was not found.`));
    }

    const tenantConfig = this.reconstituteTenantConfig(tenant.config);
    if (!tenantConfig) {
      return err(
        tenantManagementPublicApiError('TenantConfigInvalid', `Tenant "${input.tenantId}" config is invalid.`),
      );
    }

    return ok(tenantConfig.toPlainObject());
  }

  async getRentalCustomerNotificationRecipient(
    input: GetRentalCustomerNotificationRecipientInput,
  ): Promise<Result<RentalCustomerNotificationRecipient, TenantManagementPublicApiError>> {
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: {
        id: input.rentalCustomerId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!customer) {
      return err(
        tenantManagementPublicApiError(
          'RentalCustomerNotFound',
          `Rental customer "${input.rentalCustomerId}" was not found.`,
        ),
      );
    }

    return ok(customer);
  }

  async getRentalBudgetDocumentContext(
    input: GetRentalBudgetDocumentContextInput,
  ): Promise<Result<RentalBudgetDocumentContext, TenantManagementPublicApiError>> {
    const [tenant, branchContext, customer, contractSigner] = await Promise.all([
      this.prisma.client.v2Tenant.findFirst({
        where: { id: input.tenantId, status: 'ACTIVE', deletedAt: null },
        select: { slug: true, branding: { select: { logoUrl: true } } },
      }),
      this.getBranchContext({ tenantId: input.tenantId, branchId: input.branchId }),
      input.customerId
        ? this.prisma.client.v2RentalCustomer.findFirst({
            where: { id: input.customerId, tenantId: input.tenantId, deletedAt: null },
            select: {
              firstName: true,
              lastName: true,
              isCompany: true,
              companyName: true,
              profile: {
                select: { fullName: true, businessName: true, documentNumber: true, address: true, phone: true },
              },
            },
          })
        : Promise.resolve(null),
      this.prisma.client.v2TenantContractSigner.findFirst({
        where: {
          tenantId: input.tenantId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          fullName: true,
          documentNumber: true,
          address: true,
          phone: true,
          signatureUrl: true,
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      }),
    ]);

    if (!tenant) {
      return err(tenantManagementPublicApiError('TenantNotFound', `Tenant "${input.tenantId}" was not found.`));
    }
    if (branchContext.isErr()) return err(branchContext.error);

    return ok({
      tenant: { slug: tenant.slug, logoUrl: tenant.branding?.logoUrl ?? null },
      branch: { timezone: branchContext.value.effectiveTimezone },
      contractSigner: contractSigner
        ? {
            fullName: contractSigner.fullName,
            documentNumber: contractSigner.documentNumber,
            address: contractSigner.address,
            phone: contractSigner.phone,
            signatureUrl: contractSigner.signatureUrl,
          }
        : null,
      customer: customer
        ? {
            fullName: customer.isCompany
              ? (customer.profile?.businessName ??
                customer.companyName ??
                customer.profile?.fullName ??
                `${customer.firstName} ${customer.lastName}`.trim())
              : (customer.profile?.fullName ?? `${customer.firstName} ${customer.lastName}`.trim()),
            documentNumber: customer.profile?.documentNumber ?? null,
            address: customer.profile?.address ?? null,
            phone: customer.profile?.phone ?? null,
          }
        : null,
    });
  }

  async getBranchContext(input: GetBranchContextInput): Promise<Result<BranchContext, TenantManagementPublicApiError>> {
    const contexts = await this.loadBranchContexts(input.tenantId, [input.branchId]);
    if (contexts.isErr()) {
      return err(contexts.error);
    }

    const branch = contexts.value[0];
    if (!branch) {
      return err(tenantManagementPublicApiError('BranchNotFound', `Branch "${input.branchId}" was not found.`));
    }

    return ok(branch);
  }

  async getBranchContexts(
    input: GetBranchContextsInput,
  ): Promise<Result<BranchContext[], TenantManagementPublicApiError>> {
    const branchIds = [...new Set(input.branchIds)];
    const contexts = await this.loadBranchContexts(input.tenantId, branchIds);
    if (contexts.isErr()) {
      return err(contexts.error);
    }

    const foundBranchIds = new Set(contexts.value.map((branch) => branch.id));
    const missingBranchId = branchIds.find((branchId) => !foundBranchIds.has(branchId));

    if (missingBranchId) {
      return err(tenantManagementPublicApiError('BranchNotFound', `Branch "${missingBranchId}" was not found.`));
    }

    return ok(contexts.value);
  }

  private async loadBranchContexts(
    tenantId: string,
    branchIds: string[],
  ): Promise<Result<BranchContext[], TenantManagementPublicApiError>> {
    if (branchIds.length === 0) {
      return ok([]);
    }

    const branches = await this.prisma.client.v2Branch.findMany({
      where: {
        tenantId,
        id: { in: branchIds },
      },
      select: {
        id: true,
        supportsDelivery: true,
        isActive: true,
        deletedAt: true,
        timezone: true,
        tenant: {
          select: {
            config: true,
          },
        },
      },
    });

    if (branches.length === 0) {
      return ok([]);
    }

    const tenantConfig = this.reconstituteTenantConfig(branches[0].tenant.config);
    if (!tenantConfig) {
      return err(tenantManagementPublicApiError('TenantConfigInvalid', `Tenant "${tenantId}" config is invalid.`));
    }

    try {
      return ok(
        branches.map((branch) => {
          const effectiveTimezone = resolveEffectiveTimezone(branch.timezone, tenantConfig.timezone);

          const timezoneSource = branch.timezone?.trim()
            ? 'BRANCH'
            : tenantConfig.timezone?.trim()
              ? 'TENANT'
              : 'DEFAULT';

          return {
            id: branch.id,
            supportsDelivery: branch.supportsDelivery,
            isActive: branch.isActive,
            isDeleted: branch.deletedAt !== null,
            effectiveTimezone,
            branchTimezone: branch.timezone,
            tenantTimezone: tenantConfig.timezone,
            timezoneSource,
          };
        }),
      );
    } catch (error) {
      return err(
        tenantManagementPublicApiError('TenantConfigInvalid', `Tenant "${tenantId}" config is invalid.`, error),
      );
    }
  }

  async getTenantAdminNotificationRecipients(
    input: GetTenantAdminNotificationRecipientsInput,
  ): Promise<Result<TenantAdminNotificationRecipient[], TenantManagementPublicApiError>> {
    const users = await this.prisma.client.v2TenantUser.findMany({
      where: {
        tenantId: input.tenantId,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      select: {
        email: true,
        name: true,
      },
      distinct: ['email'],
    });

    return ok(
      users.map((user) => ({
        email: user.email,
        name: user.name ?? undefined,
      })),
    );
  }

  async getTenantPricingConfig(
    input: GetTenantPricingConfigInput,
  ): Promise<Result<GetTenantPricingConfigResult, RentalCommitmentError>> {
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: { id: input.tenantId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, config: true },
    });

    if (!tenant) {
      return err(new TenantUnavailableForRentalError(input.tenantId));
    }

    const tenantConfig = this.reconstituteTenantConfig(tenant.config);
    if (!tenantConfig) {
      return err(new TenantUnavailableForRentalError(input.tenantId));
    }

    return ok({
      timezone: tenantConfig.timezone,
      locale: tenantConfig.pricing.locale,
      dailyBillingPolicy: tenantConfig.pricing.roundingRule,
      minimumChargedDays: DEFAULT_MINIMUM_CHARGED_DAYS,
      halfDayThresholdMinutes: DEFAULT_HALF_DAY_THRESHOLD_MINUTES,
      insuranceEnabled: tenantConfig.pricing.insuranceEnabled,
      insuranceRatePercent: tenantConfig.pricing.insuranceRatePercent,
    });
  }

  async validateProfessionalConfirmedRentalCreation(
    input: ValidateProfessionalConfirmedRentalCreationInput,
  ): Promise<Result<ValidateProfessionalConfirmedRentalCreationResult, RentalCommitmentError>> {
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: { id: input.tenantId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, config: true },
    });

    if (!tenant) {
      return err(new TenantUnavailableForRentalError(input.tenantId));
    }

    const tenantConfig = this.reconstituteTenantConfig(tenant.config);
    if (!tenantConfig) {
      return err(new TenantUnavailableForRentalError(input.tenantId));
    }

    if (tenantConfig.bookingMode !== TenantBookingMode.INSTANT_BOOK) {
      return err(new ProfessionalConfirmedRentalCreationDisabledError(input.tenantId));
    }

    const branch = await this.prisma.client.v2Branch.findFirst({
      where: {
        id: input.branchId,
        tenantId: input.tenantId,
        isActive: true,
      },
      select: {
        id: true,
        timezone: true,
        supportsDelivery: true,
      },
    });

    if (!branch) {
      return err(new BranchUnavailableForRentalError(input.branchId));
    }

    if (input.fulfillmentMethod === FulfillmentMethod.Delivery && !branch.supportsDelivery) {
      return err(new UnsupportedBranchFulfillmentMethodError(input.branchId, input.fulfillmentMethod));
    }

    const rentalCustomer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: {
        id: input.rentalCustomerId,
        tenantId: input.tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!rentalCustomer) {
      return err(new RentalCustomerUnavailableForRentalError(input.rentalCustomerId));
    }

    const timezone = resolveEffectiveTimezone(branch.timezone, tenantConfig.timezone);
    const pickup = this.toLocalDateTimeParts(input.period.start, timezone);
    const returnAt = this.toLocalDateTimeParts(input.period.end, timezone);

    const pickupValid = await this.hasBranchScheduleWindowContainingMinute(input.branchId, 'PICKUP', pickup);
    if (!pickupValid) {
      return err(new PickupTimeOutsideBranchScheduleError(input.branchId, input.period.start));
    }

    const returnValid = await this.hasBranchScheduleWindowContainingMinute(input.branchId, 'RETURN', returnAt);
    if (!returnValid) {
      return err(new ReturnTimeOutsideBranchScheduleError(input.branchId, input.period.end));
    }

    return ok({
      pricingConfig: {
        timezone,
        dailyBillingPolicy: tenantConfig.pricing.roundingRule,
        minimumChargedDays: DEFAULT_MINIMUM_CHARGED_DAYS,
        halfDayThresholdMinutes:
          tenantConfig.pricing.roundingRule === 'BILL_OVER_HALF_DAY' ? DEFAULT_HALF_DAY_THRESHOLD_MINUTES : undefined,
      },
    });
  }

  private reconstituteTenantConfig(config: unknown): TenantConfig | null {
    try {
      return TenantConfig.reconstitute(config as TenantConfigProps);
    } catch {
      return null;
    }
  }

  private async hasBranchScheduleWindowContainingMinute(
    branchId: string,
    type: BranchScheduleSlotType,
    localDateTime: LocalDateTimeParts,
  ): Promise<boolean> {
    const specificDate = localDateToPrismaDate(localDateTime.dateKey);

    const rawRows = await this.prisma.client.v2BranchSchedule.findMany({
      where: {
        branchId,
        type,
        OR: [{ specificDate }, { dayOfWeek: localDateTime.dayOfWeek }],
      },
      select: {
        specificDate: true,
        openTime: true,
        closeTime: true,
      },
    });

    const rows = rawRows.map((row) => ({
      ...row,
      specificDate: row.specificDate ? prismaDateToLocalDate(row.specificDate) : null,
    }));

    if (rows.length === 0) {
      return false;
    }

    const hasOverride = rows.some((row) => row.specificDate !== null);
    const applicableRows = hasOverride ? rows.filter((row) => row.specificDate !== null) : rows;

    return applicableRows.some((row) =>
      BranchScheduleWindow.reconstitute({
        openTime: row.openTime,
        closeTime: row.closeTime,
        slotIntervalMinutes: null,
      }).containsMinute(localDateTime.minuteOfDay),
    );
  }

  private toLocalDateTimeParts(date: Date, timezone: string): LocalDateTimeParts {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? '0');
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour') === 24 ? 0 : get('hour');
    const minute = get('minute');
    const dateKey = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(
      2,
      '0',
    )}`;

    return {
      dateKey,
      dayOfWeek: localDateDayOfWeek(dateKey),
      minuteOfDay: hour * 60 + minute,
    };
  }
}
