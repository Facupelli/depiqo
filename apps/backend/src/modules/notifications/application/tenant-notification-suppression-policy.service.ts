import { Injectable } from '@nestjs/common';

import {
  TenantNotificationPreferences,
  TenantOrderCommunicationMode,
} from 'src/modules/tenant-management/public-api/tenant-notification-preferences.public-api';

import { NotificationDispatchSkipReason } from './types/notification-dispatch-skip-reason.enum';
import { getNotificationTypeCategory } from '../domain/notification-type-category-registry';
import { NotificationTypeCategory } from '../domain/notification-type-category.enum';
import { NotificationType } from '../domain/notification-type.enum';

export type NotificationSuppressionDecision =
  | {
      suppressed: false;
    }
  | {
      suppressed: true;
      reason: NotificationDispatchSkipReason.SUPPRESSED_BY_TENANT_COMMUNICATION_MODE;
      message: string;
    };

@Injectable()
export class TenantNotificationSuppressionPolicy {
  constructor(private readonly tenantNotificationPreferences: TenantNotificationPreferences) {}

  async evaluate(tenantId: string, notificationType: NotificationType): Promise<NotificationSuppressionDecision> {
    if (getNotificationTypeCategory(notificationType) !== NotificationTypeCategory.TENANT_WORKFLOW) {
      return { suppressed: false };
    }

    let tenantPreferencesResult: Awaited<ReturnType<TenantNotificationPreferences['getTenantNotificationPreferences']>>;

    try {
      tenantPreferencesResult = await this.tenantNotificationPreferences.getTenantNotificationPreferences({ tenantId });
    } catch {
      return { suppressed: false };
    }

    if (tenantPreferencesResult.isErr()) {
      return { suppressed: false };
    }

    if (tenantPreferencesResult.value.orderCommunicationMode !== TenantOrderCommunicationMode.WHATSAPP) {
      return { suppressed: false };
    }

    return {
      suppressed: true,
      reason: NotificationDispatchSkipReason.SUPPRESSED_BY_TENANT_COMMUNICATION_MODE,
      message: `Notification type ${notificationType} is suppressed because tenant order communication mode is WHATSAPP.`,
    };
  }
}
