import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PinoLogger } from 'nestjs-pino';

import { ConfirmedRentalEditedIntegrationEvent } from 'src/modules/rental-commitment/public-api/events/rental-lifecycle.integration-events';
import { RentalCommitmentPublicApi } from 'src/modules/rental-commitment/public-api/rental-commitment.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

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
    private readonly rentalCommitmentPublicApi: RentalCommitmentPublicApi,
    private readonly tenantManagementPublicApi: TenantManagementPublicApi,
    private readonly notificationOrchestrator: NotificationOrchestrator,
    private readonly structuredLogger: PinoLogger,
  ) {
    this.structuredLogger.setContext(SendConfirmedRentalEditedNotificationHandler.name);
  }

  @OnEvent(ConfirmedRentalEditedIntegrationEvent.name, { async: true })
  async handle(event: ConfirmedRentalEditedIntegrationEvent): Promise<void> {
    try {
      const rentalResult = await this.rentalCommitmentPublicApi.getRentalNotificationContext({
        tenantId: event.tenantId,
        rentalId: event.rentalId,
      });

      if (rentalResult.isErr()) {
        this.logger.warn(
          `Skipping confirmed rental edited notification for rental ${event.rentalId}: ${rentalResult.error.message}`,
          SendConfirmedRentalEditedNotificationHandler.name,
        );
        return;
      }

      const rental = rentalResult.value;
      if (!rental.rentalCustomerId) {
        this.logger.warn(
          `Skipping confirmed rental edited notification for rental ${event.rentalId}: rental has no customer.`,
          SendConfirmedRentalEditedNotificationHandler.name,
        );
        return;
      }

      const [tenantResult, customerResult, branchContextResult] = await Promise.all([
        this.tenantManagementPublicApi.getTenant({ tenantId: rental.tenantId }),
        this.tenantManagementPublicApi.getRentalCustomerNotificationRecipient({
          tenantId: rental.tenantId,
          rentalCustomerId: rental.rentalCustomerId,
        }),
        this.tenantManagementPublicApi.getBranchContext({
          tenantId: rental.tenantId,
          branchId: rental.branchId,
        }),
      ]);

      if (tenantResult.isErr()) {
        this.logger.warn(
          `Skipping confirmed rental edited notification for rental ${event.rentalId}: ${tenantResult.error.message}`,
          SendConfirmedRentalEditedNotificationHandler.name,
        );
        return;
      }

      if (customerResult.isErr()) {
        this.logger.warn(
          `Skipping confirmed rental edited notification for rental ${event.rentalId}: ${customerResult.error.message}`,
          SendConfirmedRentalEditedNotificationHandler.name,
        );
        return;
      }

      const customer = customerResult.value;
      if (customer.deletedAt || !customer.isActive) {
        this.logger.warn(
          `Skipping confirmed rental edited notification for rental ${event.rentalId}: rental customer ${customer.id} is inactive or deleted.`,
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

      const pickup = formatDateTimeInTimezone(rental.periodStart, branchContextResult.value.effectiveTimezone);
      const returnAt = formatDateTimeInTimezone(rental.periodEnd, branchContextResult.value.effectiveTimezone);

      await this.notificationOrchestrator.dispatch({
        tenantId: rental.tenantId,
        notificationType: NotificationType.CONFIRMED_RENTAL_EDITED,
        emailRecipients: [{ email: customer.email }],
        payload: {
          tenantName: tenantResult.value.name,
          rentalNumber: rental.rentalNumber,
          status: rental.status,
          fulfillmentMethod: rental.fulfillmentMethod,
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
          rentalId: rental.rentalId,
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
