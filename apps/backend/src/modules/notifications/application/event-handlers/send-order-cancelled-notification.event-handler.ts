import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { OrderCancelledEvent } from 'src/modules/order/public/events/order-cancelled.event';
import { TenantManagementPublicApi } from 'src/modules/v2/tenant-management/public-api/tenant-management.public-api';

import { NotificationType } from '../../domain/notification-type.enum';
import { NotificationOrchestrator } from '../notification-orchestrator.service';

@Injectable()
export class SendOrderCancelledNotificationHandler {
  constructor(
    private readonly tenantManagementPublicApi: TenantManagementPublicApi,
    private readonly notificationOrchestrator: NotificationOrchestrator,
  ) {}

  @OnEvent(OrderCancelledEvent.EVENT_NAME, { async: true })
  async handle(event: OrderCancelledEvent): Promise<void> {
    if (!event.customerId) {
      return;
    }

    const [customerResult, tenantResult] = await Promise.all([
      this.tenantManagementPublicApi.getRentalCustomerNotificationRecipient({
        tenantId: event.tenantId,
        rentalCustomerId: event.customerId,
      }),
      this.tenantManagementPublicApi.getTenant({ tenantId: event.tenantId }),
    ]);

    const customer = customerResult.isOk() ? customerResult.value : null;
    const tenant = tenantResult.isOk() ? tenantResult.value : null;

    if (!customer || customer.deletedAt || !customer.isActive) {
      return;
    }

    await this.notificationOrchestrator.dispatch({
      tenantId: event.tenantId,
      notificationType: NotificationType.ORDER_CANCELLED,
      emailRecipients: [{ email: customer.email }],
      payload: {
        tenantName: tenant?.name,
      },
      metadata: {
        orderId: event.aggregateId,
      },
      idempotencyKey: `order-cancelled:${event.aggregateId}`,
    });
  }
}
