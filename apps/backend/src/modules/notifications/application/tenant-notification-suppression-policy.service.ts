import { Injectable } from '@nestjs/common';
import { OrderCommunicationMode } from '@repo/types';

import { TenantManagementPublicApi } from 'src/modules/v2/tenant-management/public-api/tenant-management.public-api';

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
  constructor(private readonly tenantManagementPublicApi: TenantManagementPublicApi) {}

  async evaluate(tenantId: string, notificationType: NotificationType): Promise<NotificationSuppressionDecision> {
    if (getNotificationTypeCategory(notificationType) !== NotificationTypeCategory.TENANT_WORKFLOW) {
      return { suppressed: false };
    }

    let tenantConfigResult: Awaited<ReturnType<TenantManagementPublicApi['getTenantConfig']>>;

    try {
      tenantConfigResult = await this.tenantManagementPublicApi.getTenantConfig({ tenantId });
    } catch {
      return { suppressed: false };
    }

    if (tenantConfigResult.isErr()) {
      return { suppressed: false };
    }

    if (tenantConfigResult.value.communication.orderCommunicationMode !== OrderCommunicationMode.WHATSAPP) {
      return { suppressed: false };
    }

    return {
      suppressed: true,
      reason: NotificationDispatchSkipReason.SUPPRESSED_BY_TENANT_COMMUNICATION_MODE,
      message: `Notification type ${notificationType} is suppressed because tenant order communication mode is WHATSAPP.`,
    };
  }
}
