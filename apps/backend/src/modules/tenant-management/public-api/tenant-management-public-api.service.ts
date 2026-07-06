import { Injectable } from '@nestjs/common';
import { TenantContext } from '@repo/schemas';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
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
  GetBranchContextInput,
  GetRentalCustomerNotificationRecipientInput,
  GetTenantAdminNotificationRecipientsInput,
  GetTenantConfigInput,
  GetTenantConfigResult,
  GetTenantInput,
  GetTenantPricingConfigInput,
  GetTenantPricingConfigResult,
  RentalCustomerNotificationRecipient,
  TenantAdminNotificationRecipient,
  TenantManagementPublicApi,
  TenantManagementPublicApiError,
  ValidateDraftRentalInput,
  ValidateDraftRentalResult,
  ValidateOfferingSetupInput,
  ValidateProfessionalConfirmedRentalCreationInput,
  ValidateProfessionalConfirmedRentalCreationResult,
  ValidateWhatsAppStylePendingRentalInput,
} from './tenant-management.public-api';
import { TenantBookingMode, TenantConfig, TenantConfigProps } from '../domain/value-objects/tenant-config.value-object';
import { BranchScheduleWindow } from '../domain/value-objects/branch-schedule-window.value-object';

type LocalDateTimeParts = {
  dateKey: string;
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

    const timezone = branch.timezone ?? tenantConfig.timezone;

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

  async validateOfferingSetup(input: ValidateOfferingSetupInput): Promise<Result<void, RentalCommitmentError>> {
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: { id: input.tenantId, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });

    if (!tenant) {
      return err(new TenantUnavailableForRentalError(input.tenantId));
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
      return err(new BranchUnavailableForRentalError(unavailableBranchId));
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

  async getBranchContext(input: GetBranchContextInput): Promise<Result<BranchContext, TenantManagementPublicApiError>> {
    const branch = await this.prisma.client.v2Branch.findFirst({
      where: {
        id: input.branchId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        supportsDelivery: true,
        timezone: true,
        tenant: {
          select: {
            config: true,
          },
        },
      },
    });

    if (!branch) {
      return err(tenantManagementPublicApiError('BranchNotFound', `Branch "${input.branchId}" was not found.`));
    }

    const tenantConfig = this.reconstituteTenantConfig(branch.tenant.config);
    if (!tenantConfig) {
      return err(
        tenantManagementPublicApiError('TenantConfigInvalid', `Tenant "${input.tenantId}" config is invalid.`),
      );
    }

    return ok({
      id: branch.id,
      supportsDelivery: branch.supportsDelivery,
      effectiveTimezone: branch.timezone ?? tenantConfig.timezone,
      branchTimezone: branch.timezone,
      tenantTimezone: tenantConfig.timezone,
      timezoneSource: branch.timezone ? 'BRANCH' : 'TENANT',
    });
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

    const timezone = branch.timezone ?? tenantConfig.timezone;
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
    const specificDate = new Date(`${localDateTime.dateKey}T00:00:00.000Z`);

    const rows = await this.prisma.client.v2BranchSchedule.findMany({
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
      dayOfWeek: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
      minuteOfDay: hour * 60 + minute,
    };
  }
}
