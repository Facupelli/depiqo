import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  GetTenantBillingPreferencesInput,
  TenantBillingPreferences,
  TenantBillingPreferencesError,
  TenantBillingPreferencesFact,
  TenantDailyBillingPolicy,
} from './tenant-billing-preferences.public-api';
import {
  TenantConfig,
  TenantConfigProps,
  TenantRoundingRule,
} from '../domain/value-objects/tenant-config.value-object';

@Injectable()
export class TenantBillingPreferencesService extends TenantBillingPreferences {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getTenantBillingPreferences(
    input: GetTenantBillingPreferencesInput,
  ): Promise<Result<TenantBillingPreferencesFact, TenantBillingPreferencesError>> {
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
      dailyBillingPolicy: this.toDailyBillingPolicy(config.pricing.roundingRule),
      weekendCountsAsOne: config.pricing.weekendCountsAsOne,
    });
  }

  private toDailyBillingPolicy(roundingRule: TenantRoundingRule): TenantDailyBillingPolicy {
    switch (roundingRule) {
      case TenantRoundingRule.BILL_ANY_PARTIAL_DAY:
        return 'BILL_ANY_PARTIAL_DAY';
      case TenantRoundingRule.BILL_OVER_QUARTER_DAY:
        return 'BILL_OVER_QUARTER_DAY';
      case TenantRoundingRule.BILL_OVER_HALF_DAY:
        return 'BILL_OVER_HALF_DAY';
      case TenantRoundingRule.IGNORE_PARTIAL_DAY:
        return 'IGNORE_PARTIAL_DAY';
    }
  }

  private reconstituteTenantConfig(config: unknown): TenantConfig | null {
    try {
      return TenantConfig.reconstitute(config as TenantConfigProps);
    } catch {
      return null;
    }
  }
}
