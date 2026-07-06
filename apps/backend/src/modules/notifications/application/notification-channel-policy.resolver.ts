import { Injectable } from '@nestjs/common';

import {
  GetTenantConfigResult,
  TenantManagementPublicApi,
} from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { getAllowedChannelsForNotificationType } from '../domain/notification-channel-registry';
import { NotificationChannel } from '../domain/notification-channel.enum';
import { NotificationType } from '../domain/notification-type.enum';

@Injectable()
export class NotificationChannelPolicyResolver {
  constructor(private readonly tenantManagementPublicApi: TenantManagementPublicApi) {}

  async resolveChannels(tenantId: string, notificationType: NotificationType): Promise<readonly NotificationChannel[]> {
    const allowedChannels = getAllowedChannelsForNotificationType(notificationType);
    const tenantConfigResult = await this.tenantManagementPublicApi.getTenantConfig({ tenantId });

    if (tenantConfigResult.isErr()) {
      return [];
    }

    const enabledChannels = new Set(this.mapTenantChannelsToNotificationChannels(tenantConfigResult.value));

    return allowedChannels.filter((channel) => enabledChannels.has(channel));
  }

  private mapTenantChannelsToNotificationChannels(tenantConfig: GetTenantConfigResult): NotificationChannel[] {
    return tenantConfig.notifications.enabledChannels.flatMap((channel) => {
      switch (channel) {
        case 'EMAIL':
          return [NotificationChannel.EMAIL];
        default:
          return [];
      }
    });
  }
}
