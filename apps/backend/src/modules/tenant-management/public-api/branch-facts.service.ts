import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { BranchFact, BranchFacts, BranchFactsError } from './branch-facts.public-api';
import { TenantConfig, TenantConfigProps } from '../domain/value-objects/tenant-config.value-object';
import { resolveEffectiveTimezone } from '../domain/utils/effective-timezone';

@Injectable()
export class BranchFactsService extends BranchFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getBranchFacts(input: { tenantId: string; branchId: string }): Promise<Result<BranchFact, BranchFactsError>> {
    const result = await this.getBranchFactsBatch({ tenantId: input.tenantId, branchIds: [input.branchId] });
    if (result.isErr()) return err(result.error);

    const branch = result.value[0];
    if (!branch) return err(this.branchNotFound(input.branchId));
    return ok(branch);
  }

  async getBranchFactsBatch(input: {
    tenantId: string;
    branchIds: string[];
  }): Promise<Result<BranchFact[], BranchFactsError>> {
    const branchIds = [...new Set(input.branchIds)];
    if (branchIds.length === 0) return ok([]);

    const branches = await this.prisma.client.v2Branch.findMany({
      where: { tenantId: input.tenantId, id: { in: branchIds } },
      select: {
        id: true,
        supportsDelivery: true,
        isActive: true,
        deletedAt: true,
        timezone: true,
        operationalLocationFormattedAddress: true,
        operationalLocationLatitude: true,
        operationalLocationLongitude: true,
        operationalLocationStreet: true,
        operationalLocationStreetNumber: true,
        operationalLocationCity: true,
        operationalLocationStateRegion: true,
        operationalLocationPostalCode: true,
        operationalLocationCountry: true,
        operationalLocationProviderPlaceId: true,
        tenant: { select: { config: true } },
      },
    });

    const config = branches[0] ? this.reconstituteTenantConfig(branches[0].tenant.config) : null;
    if (branches.length > 0 && !config) {
      return err({
        code: 'TenantConfigurationInvalid',
        message: `Tenant "${input.tenantId}" configuration is invalid.`,
      });
    }

    let facts: BranchFact[];
    try {
      facts = branches.map((branch) => ({
        branchId: branch.id,
        supportsDelivery: branch.supportsDelivery,
        isActive: branch.isActive,
        isDeleted: branch.deletedAt !== null,
        effectiveTimezone: resolveEffectiveTimezone(branch.timezone, config!.timezone),
        operationalLocation:
          branch.operationalLocationFormattedAddress !== null &&
          branch.operationalLocationLatitude !== null &&
          branch.operationalLocationLongitude !== null
            ? {
                formattedAddress: branch.operationalLocationFormattedAddress,
                latitude: branch.operationalLocationLatitude,
                longitude: branch.operationalLocationLongitude,
                street: branch.operationalLocationStreet,
                streetNumber: branch.operationalLocationStreetNumber,
                city: branch.operationalLocationCity,
                stateRegion: branch.operationalLocationStateRegion,
                postalCode: branch.operationalLocationPostalCode,
                country: branch.operationalLocationCountry,
                providerPlaceId: branch.operationalLocationProviderPlaceId,
              }
            : null,
        branchTimezone: branch.timezone,
        tenantTimezone: config!.timezone,
        timezoneSource: branch.timezone?.trim() ? 'BRANCH' : config!.timezone?.trim() ? 'TENANT' : 'DEFAULT',
      }));
    } catch {
      return err({
        code: 'TenantConfigurationInvalid',
        message: `Tenant "${input.tenantId}" configuration is invalid.`,
      });
    }

    const found = new Set(facts.map((branch) => branch.branchId));
    const missingBranchId = branchIds.find((branchId) => !found.has(branchId));
    if (missingBranchId) return err(this.branchNotFound(missingBranchId));

    return ok(facts);
  }

  private branchNotFound(branchId: string): BranchFactsError {
    return { code: 'BranchNotFound', message: `Branch "${branchId}" was not found.` };
  }

  private reconstituteTenantConfig(config: unknown): TenantConfig | null {
    try {
      return TenantConfig.reconstitute(config as TenantConfigProps);
    } catch {
      return null;
    }
  }
}
