import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  GetTenantNotificationPreferencesInput,
  TenantNotificationDeliveryChannel,
  TenantNotificationPreferences,
  TenantNotificationPreferencesError,
  TenantNotificationPreferencesFact,
  TenantOrderCommunicationMode,
} from './tenant-notification-preferences.public-api';
import {
  TenantConfig,
  TenantConfigProps,
  TenantOrderCommunicationMode as TenantConfigOrderCommunicationMode,
} from '../domain/value-objects/tenant-config.value-object';

@Injectable()
export class TenantNotificationPreferencesService extends TenantNotificationPreferences {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getTenantNotificationPreferences(
    input: GetTenantNotificationPreferencesInput,
  ): Promise<Result<TenantNotificationPreferencesFact, TenantNotificationPreferencesError>> {
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: { id: input.tenantId, status: 'ACTIVE', deletedAt: null },
      select: { config: true },
    });

    if (!tenant) {
      return err({ code: 'TenantNotFound', message: `Tenant "${input.tenantId}" was not found.` });
    }

    const config = this.reconstituteTenantConfig(tenant.config);
    if (!config) {
      return err({
        code: 'TenantConfigurationInvalid',
        message: `Tenant "${input.tenantId}" configuration is invalid.`,
      });
    }

    return ok({
      enabledChannels: config.notifications.enabledChannels.map((channel) => this.toDeliveryChannel(channel)),
      orderCommunicationMode: this.toOrderCommunicationMode(config.communication.orderCommunicationMode),
    });
  }

  private reconstituteTenantConfig(config: unknown): TenantConfig | null {
    try {
      return TenantConfig.reconstitute(config as TenantConfigProps);
    } catch {
      return null;
    }
  }

  private toDeliveryChannel(channel: 'EMAIL'): TenantNotificationDeliveryChannel {
    return channel;
  }

  private toOrderCommunicationMode(mode: TenantConfigOrderCommunicationMode): TenantOrderCommunicationMode {
    return mode === TenantConfigOrderCommunicationMode.WHATSAPP
      ? TenantOrderCommunicationMode.WHATSAPP
      : TenantOrderCommunicationMode.FORMAL;
  }
}
