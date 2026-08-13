import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  GetTenantInsuranceOfferingTermsInput,
  TenantInsuranceOfferingTerms,
  TenantInsuranceOfferingTermsError,
  TenantInsuranceOfferingTermsFact,
} from './tenant-insurance-offering-terms.public-api';
import { TenantConfig, TenantConfigProps } from '../domain/value-objects/tenant-config.value-object';

@Injectable()
export class TenantInsuranceOfferingTermsService extends TenantInsuranceOfferingTerms {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getTenantInsuranceOfferingTerms(
    input: GetTenantInsuranceOfferingTermsInput,
  ): Promise<Result<TenantInsuranceOfferingTermsFact, TenantInsuranceOfferingTermsError>> {
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: { id: input.tenantId, status: 'ACTIVE', deletedAt: null },
      select: { config: true },
    });

    if (!tenant) return err({ code: 'TenantNotFound', message: `Tenant "${input.tenantId}" was not found.` });

    const config = this.reconstituteTenantConfig(tenant.config);
    if (!config) {
      return err({
        code: 'TenantConfigurationInvalid',
        message: `Tenant "${input.tenantId}" configuration is invalid.`,
      });
    }

    return ok({
      insuranceEnabled: config.pricing.insuranceEnabled,
      insuranceRatePercent: config.pricing.insuranceRatePercent,
    });
  }

  private reconstituteTenantConfig(config: unknown): TenantConfig | null {
    try {
      return TenantConfig.reconstitute(config as TenantConfigProps);
    } catch {
      return null;
    }
  }
}
