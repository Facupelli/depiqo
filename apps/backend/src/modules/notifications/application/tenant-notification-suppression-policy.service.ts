import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { TenantConfig } from '@repo/schemas';
import { OrderCommunicationMode } from '@repo/types';
import { GetTenantConfigQuery } from 'src/modules/tenant/public/queries/get-tenant-config.query';

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
  constructor(private readonly queryBus: QueryBus) {}

  async evaluate(tenantId: string, notificationType: NotificationType): Promise<NotificationSuppressionDecision> {
    if (getNotificationTypeCategory(notificationType) !== NotificationTypeCategory.TENANT_WORKFLOW) {
      return { suppressed: false };
    }

    let tenantConfig: TenantConfig | null;

    try {
      tenantConfig = await this.queryBus.execute<GetTenantConfigQuery, TenantConfig | null>(
        new GetTenantConfigQuery(tenantId),
      );
    } catch {
      return { suppressed: false };
    }

    if (!tenantConfig) {
      return { suppressed: false };
    }

    if (tenantConfig.communication.orderCommunicationMode !== OrderCommunicationMode.WHATSAPP) {
      return { suppressed: false };
    }

    return {
      suppressed: true,
      reason: NotificationDispatchSkipReason.SUPPRESSED_BY_TENANT_COMMUNICATION_MODE,
      message: `Notification type ${notificationType} is suppressed because tenant order communication mode is WHATSAPP.`,
    };
  }
}
