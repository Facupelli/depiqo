import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PinoLogger } from 'nestjs-pino';

import { ConfirmedRentalEditedIntegrationEvent } from 'src/modules/rental-commitment/public-api/events/rental-lifecycle.integration-events';
import { RentalCustomerContactFacts } from 'src/modules/tenant-management/public-api/rental-customer-contact-facts.public-api';
import { TenantIdentityFacts } from 'src/modules/tenant-management/public-api/tenant-identity-facts.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';

import { NotificationType } from '../../domain/notification-type.enum';
import { NotificationOrchestrator } from '../notification-orchestrator.service';

type FormattedDateTime = {
  date: string;
  time: string;
};

function formatDateTimeInTimezone(date: Date, timezone: string): FormattedDateTime {
  const dateFormatter = new Intl.DateTimeFormat('es-AR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat('es-AR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return {
    date: dateFormatter.format(date),
    time: timeFormatter.format(date),
  };
}

@Injectable()
export class SendConfirmedRentalEditedNotificationHandler {
  private readonly logger = new Logger(SendConfirmedRentalEditedNotificationHandler.name);

  constructor(
    private readonly rentalCustomerContactFacts: RentalCustomerContactFacts,
    private readonly tenantIdentityFacts: TenantIdentityFacts,
    private readonly branchFacts: BranchFacts,
    private readonly notificationOrchestrator: NotificationOrchestrator,
    private readonly structuredLogger: PinoLogger,
  ) {
    this.structuredLogger.setContext(SendConfirmedRentalEditedNotificationHandler.name);
  }

  @OnEvent(ConfirmedRentalEditedIntegrationEvent.name)
  async handle(event: ConfirmedRentalEditedIntegrationEvent): Promise<void> {
    try {
      if (!event.rentalCustomerId) {
        this.logger.warn(
          `Skipping confirmed rental edited notification for rental ${event.rentalId}: rental has no customer.`,
          SendConfirmedRentalEditedNotificationHandler.name,
        );
        return;
      }

      const [tenantResult, customerResult, branchContextResult] = await Promise.all([
        this.tenantIdentityFacts.getTenantIdentityFacts({ tenantId: event.tenantId }),
        this.rentalCustomerContactFacts.getRentalCustomerContactFacts({
          tenantId: event.tenantId,
          rentalCustomerId: event.rentalCustomerId,
        }),
        this.branchFacts.getBranchFacts({
          tenantId: event.tenantId,
          branchId: event.branchId,
        }),
      ]);

      if (tenantResult.isErr()) {
        this.logger.warn(
          `Skipping confirmed rental edited notification for rental ${event.rentalId}: ${tenantResult.error.message}`,
          SendConfirmedRentalEditedNotificationHandler.name,
        );
        return;
      }

      const customer = customerResult;
      if (!customer) {
        this.logger.warn(
          `Skipping confirmed rental edited notification for rental ${event.rentalId}: Rental customer "${event.rentalCustomerId}" was not found.`,
          SendConfirmedRentalEditedNotificationHandler.name,
        );
        return;
      }

      if (customer.isDeleted || !customer.isActive) {
        this.logger.warn(
          `Skipping confirmed rental edited notification for rental ${event.rentalId}: rental customer ${customer.rentalCustomerId} is inactive or deleted.`,
          SendConfirmedRentalEditedNotificationHandler.name,
        );
        return;
      }

      if (branchContextResult.isErr()) {
        this.logger.warn(
          `Skipping confirmed rental edited notification for rental ${event.rentalId}: ${branchContextResult.error.message}`,
          SendConfirmedRentalEditedNotificationHandler.name,
        );
        return;
      }

      const pickup = formatDateTimeInTimezone(event.periodStart, branchContextResult.value.effectiveTimezone);
      const returnAt = formatDateTimeInTimezone(event.periodEnd, branchContextResult.value.effectiveTimezone);

      await this.notificationOrchestrator.dispatch({
        tenantId: event.tenantId,
        notificationType: NotificationType.CONFIRMED_RENTAL_EDITED,
        emailRecipients: [{ email: customer.email }],
        payload: {
          tenantName: tenantResult.value.name,
          rentalNumber: event.rentalId.slice(0, 4),
          status: event.status,
          fulfillmentMethod: event.fulfillmentMethod,
          pickupDate: pickup.date,
          pickupTime: pickup.time,
          returnDate: returnAt.date,
          returnTime: returnAt.time,
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
        idempotencyKey: `confirmed-rental-edited:${event.eventId}`,
      });
    } catch (error) {
      this.structuredLogger.error(
        {
          err: error instanceof Error ? error : new Error('A non-Error value was thrown.', { cause: error }),
          eventName: ConfirmedRentalEditedIntegrationEvent.name,
          rentalId: event.rentalId,
        },
        'Failed to handle confirmed rental edited event',
      );
    }
  }
}
