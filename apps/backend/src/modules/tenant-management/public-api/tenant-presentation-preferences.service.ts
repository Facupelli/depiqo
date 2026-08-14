import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  GetTenantPresentationPreferencesInput,
  TenantPresentationPreferences,
  TenantPresentationPreferencesError,
  TenantPresentationPreferencesFact,
} from './tenant-presentation-preferences.public-api';
import { TenantConfig, TenantConfigProps } from '../domain/value-objects/tenant-config.value-object';

@Injectable()
export class TenantPresentationPreferencesService extends TenantPresentationPreferences {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getTenantPresentationPreferences(
    input: GetTenantPresentationPreferencesInput,
  ): Promise<Result<TenantPresentationPreferencesFact, TenantPresentationPreferencesError>> {
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

    return ok({ locale: config.pricing.locale });
  }

  private reconstituteTenantConfig(config: unknown): TenantConfig | null {
    try {
      return TenantConfig.reconstitute(config as TenantConfigProps);
    } catch {
      return null;
    }
  }
}
