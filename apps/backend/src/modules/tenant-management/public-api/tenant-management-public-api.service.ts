import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  CategoryDisplayFact,
  GetCategoryDisplayFactsInput,
  GetRentalBudgetDocumentContextInput,
  GetRentalCustomerNotificationRecipientInput,
  GetTenantAdminNotificationRecipientsInput,
  GetTenantInput,
  RentalBudgetDocumentContext,
  RentalCustomerNotificationRecipient,
  TenantAdminNotificationRecipient,
  TenantContext,
  TenantManagementPublicApi,
  TenantManagementPublicApiError,
  ValidateCategoryAssignmentError,
  ValidateCategoryAssignmentInput,
} from './tenant-management.public-api';
import { TenantConfig, TenantConfigProps } from '../domain/value-objects/tenant-config.value-object';
import { resolveEffectiveTimezone } from '../domain/utils/effective-timezone';

type BudgetDocumentBranchContext = {
  id: string;
  supportsDelivery: boolean;
  isActive: boolean;
  isDeleted: boolean;
  effectiveTimezone: string;
  branchTimezone: string | null;
  tenantTimezone: string;
  timezoneSource: 'BRANCH' | 'TENANT' | 'DEFAULT';
};

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

  async getCategoryDisplayFacts(input: GetCategoryDisplayFactsInput): Promise<CategoryDisplayFact[]> {
    const categoryIds = [...new Set(input.categoryIds)];
    if (categoryIds.length === 0) return [];

    return this.prisma.client.v2Category.findMany({
      where: {
        id: { in: categoryIds },
        tenantId: input.tenantId,
        deletedAt: null,
      },
      select: { id: true, name: true },
    });
  }

  async validateCategoryAssignment(
    input: ValidateCategoryAssignmentInput,
  ): Promise<Result<void, ValidateCategoryAssignmentError>> {
    const category = await this.prisma.client.v2Category.findFirst({
      where: { id: input.categoryId, tenantId: input.tenantId, deletedAt: null },
      select: { isActive: true },
    });

    if (!category) {
      return err({
        code: 'CategoryNotFound',
        message: `Category "${input.categoryId}" was not found.`,
        context: { categoryId: input.categoryId },
      });
    }
    if (!category.isActive) {
      return err({
        code: 'CategoryInactive',
        message: `Category "${input.categoryId}" is inactive.`,
        context: { categoryId: input.categoryId },
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
      this.getBranchContextForBudgetDocument({ tenantId: input.tenantId, branchId: input.branchId }),
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

  private async getBranchContextForBudgetDocument(input: {
    tenantId: string;
    branchId: string;
  }): Promise<Result<BudgetDocumentBranchContext, TenantManagementPublicApiError>> {
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

  private async loadBranchContexts(
    tenantId: string,
    branchIds: string[],
  ): Promise<Result<BudgetDocumentBranchContext[], TenantManagementPublicApiError>> {
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

  private reconstituteTenantConfig(config: unknown): TenantConfig | null {
    try {
      return TenantConfig.reconstitute(config as TenantConfigProps);
    } catch {
      return null;
    }
  }
}
