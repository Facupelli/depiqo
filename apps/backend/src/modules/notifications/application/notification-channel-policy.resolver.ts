import { Injectable } from '@nestjs/common';

import {
  TenantNotificationPreferences,
  TenantNotificationPreferencesFact,
} from 'src/modules/tenant-management/public-api/tenant-notification-preferences.public-api';

import { getAllowedChannelsForNotificationType } from '../domain/notification-channel-registry';
import { NotificationChannel } from '../domain/notification-channel.enum';
import { NotificationType } from '../domain/notification-type.enum';

@Injectable()
export class NotificationChannelPolicyResolver {
  constructor(private readonly tenantNotificationPreferences: TenantNotificationPreferences) {}

  async resolveChannels(tenantId: string, notificationType: NotificationType): Promise<readonly NotificationChannel[]> {
    const allowedChannels = getAllowedChannelsForNotificationType(notificationType);
    const tenantPreferencesResult = await this.tenantNotificationPreferences.getTenantNotificationPreferences({
      tenantId,
    });

    if (tenantPreferencesResult.isErr()) {
      return [];
    }

    const enabledChannels = new Set(this.mapTenantChannelsToNotificationChannels(tenantPreferencesResult.value));

    return allowedChannels.filter((channel) => enabledChannels.has(channel));
  }

  private mapTenantChannelsToNotificationChannels(
    preferences: TenantNotificationPreferencesFact,
  ): NotificationChannel[] {
    return preferences.enabledChannels.flatMap((channel) => {
      switch (channel) {
        case 'EMAIL':
          return [NotificationChannel.EMAIL];
        default:
          return [];
      }
    });
  }
}
