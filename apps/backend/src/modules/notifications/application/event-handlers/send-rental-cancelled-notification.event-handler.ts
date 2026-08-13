import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PinoLogger } from 'nestjs-pino';

import { RentalCancelledIntegrationEvent } from 'src/modules/rental-commitment/public-api/events/rental-lifecycle.integration-events';
import { RentalCustomerContactFacts } from 'src/modules/tenant-management/public-api/rental-customer-contact-facts.public-api';
import { TenantIdentityFacts } from 'src/modules/tenant-management/public-api/tenant-identity-facts.public-api';

import { NotificationType } from '../../domain/notification-type.enum';
import { NotificationOrchestrator } from '../notification-orchestrator.service';

@Injectable()
export class SendRentalCancelledNotificationHandler {
  private readonly logger = new Logger(SendRentalCancelledNotificationHandler.name);

  constructor(
    private readonly rentalCustomerContactFacts: RentalCustomerContactFacts,
    private readonly tenantIdentityFacts: TenantIdentityFacts,
    private readonly notificationOrchestrator: NotificationOrchestrator,
    private readonly structuredLogger: PinoLogger,
  ) {
    this.structuredLogger.setContext(SendRentalCancelledNotificationHandler.name);
  }

  @OnEvent(RentalCancelledIntegrationEvent.name)
  async handle(event: RentalCancelledIntegrationEvent): Promise<void> {
    try {
      if (!event.rentalCustomerId) {
        this.logger.warn(
          `Skipping rental cancelled notification for rental ${event.rentalId}: rental has no customer.`,
          SendRentalCancelledNotificationHandler.name,
        );
        return;
      }

      const [tenantResult, customerResult] = await Promise.all([
        this.tenantIdentityFacts.getTenantIdentityFacts({ tenantId: event.tenantId }),
        this.rentalCustomerContactFacts.getRentalCustomerContactFacts({
          tenantId: event.tenantId,
          rentalCustomerId: event.rentalCustomerId,
        }),
      ]);

      if (tenantResult.isErr()) {
        this.logger.warn(
          `Skipping rental cancelled notification for rental ${event.rentalId}: ${tenantResult.error.message}`,
          SendRentalCancelledNotificationHandler.name,
        );
        return;
      }

      const customer = customerResult;
      if (!customer) {
        this.logger.warn(
          `Skipping rental cancelled notification for rental ${event.rentalId}: Rental customer "${event.rentalCustomerId}" was not found.`,
          SendRentalCancelledNotificationHandler.name,
        );
        return;
      }

      if (customer.isDeleted || !customer.isActive) {
        this.logger.warn(
          `Skipping rental cancelled notification for rental ${event.rentalId}: rental customer ${customer.rentalCustomerId} is inactive or deleted.`,
          SendRentalCancelledNotificationHandler.name,
        );
        return;
      }

      await this.notificationOrchestrator.dispatch({
        tenantId: event.tenantId,
        notificationType: NotificationType.RENTAL_CANCELLED,
        emailRecipients: [{ email: customer.email }],
        payload: {
          tenantName: tenantResult.value.name,
        },
        source: {
          context: 'rental-commitment',
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventId: event.eventId,
        },
        metadata: {
          rentalId: event.rentalId,
        },
        idempotencyKey: `rental-cancelled:${event.rentalId}`,
      });
    } catch (error) {
      this.structuredLogger.error(
        {
          err: error instanceof Error ? error : new Error('A non-Error value was thrown.', { cause: error }),
          eventName: RentalCancelledIntegrationEvent.name,
          rentalId: event.rentalId,
        },
        'Failed to handle rental cancelled event',
      );
    }
  }
}
