import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { TenantConfig, TenantConfigProps } from '../domain/value-objects/tenant-config.value-object';
import {
  GetTenantRentalAssetBufferSettingsInput,
  TenantRentalAssetBufferSettings,
  TenantRentalAssetBufferSettingsError,
  TenantRentalAssetBufferSettingsFact,
} from './tenant-rental-asset-buffer-settings.public-api';

@Injectable()
export class TenantRentalAssetBufferSettingsService extends TenantRentalAssetBufferSettings {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getTenantRentalAssetBufferSettings(
    input: GetTenantRentalAssetBufferSettingsInput,
  ): Promise<Result<TenantRentalAssetBufferSettingsFact, TenantRentalAssetBufferSettingsError>> {
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
      beforeBufferMinutes: config.rentalAssetBuffer.beforeBufferMinutes,
      afterBufferMinutes: config.rentalAssetBuffer.afterBufferMinutes,
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
