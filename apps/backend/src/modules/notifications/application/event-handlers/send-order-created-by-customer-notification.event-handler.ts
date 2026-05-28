import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { OrderCreatedByCustomerEvent } from 'src/modules/order/public/events/order-created-by-customer.event';
import { TenantManagementPublicApi } from 'src/modules/v2/tenant-management/public-api/tenant-management.public-api';

import { NotificationType } from '../../domain/notification-type.enum';
import { NotificationOrchestrator } from '../notification-orchestrator.service';

function formatMinutesFromMidnight(minutes: number): string {
  const hour = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const minute = (minutes % 60).toString().padStart(2, '0');

  return `${hour}:${minute}`;
}

@Injectable()
export class SendOrderCreatedByCustomerNotificationHandler {
  constructor(
    private readonly tenantManagementPublicApi: TenantManagementPublicApi,
    private readonly notificationOrchestrator: NotificationOrchestrator,
  ) {}

  @OnEvent(OrderCreatedByCustomerEvent.EVENT_NAME, { async: true })
  async handle(event: OrderCreatedByCustomerEvent): Promise<void> {
    const [customerResult, tenantResult, branchContextResult, recipientsResult] = await Promise.all([
      this.tenantManagementPublicApi.getRentalCustomerNotificationRecipient({
        tenantId: event.tenantId,
        rentalCustomerId: event.customerId,
      }),
      this.tenantManagementPublicApi.getTenant({ tenantId: event.tenantId }),
      this.tenantManagementPublicApi.getBranchContext({
        tenantId: event.tenantId,
        branchId: event.locationId,
      }),
      this.tenantManagementPublicApi.getTenantAdminNotificationRecipients({ tenantId: event.tenantId }),
    ]);

    const customer = customerResult.isOk() ? customerResult.value : null;
    const tenant = tenantResult.isOk() ? tenantResult.value : null;
    const branchContext = branchContextResult.isOk() ? branchContextResult.value : null;
    const recipients = recipientsResult.isOk() ? recipientsResult.value : [];

    if (!customer || customer.deletedAt || !customer.isActive || recipients.length === 0) {
      return;
    }

    await this.notificationOrchestrator.dispatch({
      tenantId: event.tenantId,
      notificationType: NotificationType.ORDER_CREATED_BY_CUSTOMER,
      emailRecipients: recipients.map((recipient) => ({
        email: recipient.email,
        name: recipient.name,
      })),
      payload: {
        tenantName: tenant?.name,
        orderNumber: event.orderNumber,
        customerEmail: customer.email,
        status: event.status,
        fulfillmentMethod: event.fulfillmentMethod,
        pickupDate: event.pickupDate,
        pickupTime: formatMinutesFromMidnight(event.pickupTime),
        returnDate: event.returnDate,
        returnTime: formatMinutesFromMidnight(event.returnTime),
        timezone: branchContext?.effectiveTimezone,
      },
      metadata: {
        orderId: event.aggregateId,
      },
      idempotencyKey: `order-created-by-customer:${event.aggregateId}`,
    });
  }
}
