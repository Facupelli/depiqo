import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AppLogger } from 'src/core/logger/app-logger.service';
import { RentalConfirmedEvent } from 'src/modules/rental-commitment/public-api/events/rental-confirmed.event';
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
export class SendRentalConfirmedConfirmationNotificationHandler {
  constructor(
    private readonly rentalCommitmentPublicApi: RentalCommitmentPublicApi,
    private readonly tenantManagementPublicApi: TenantManagementPublicApi,
    private readonly notificationOrchestrator: NotificationOrchestrator,
    private readonly logger: AppLogger,
  ) {}

  @OnEvent(RentalConfirmedEvent.name, { async: true })
  async handle(event: RentalConfirmedEvent): Promise<void> {
    try {
      const rentalResult = await this.rentalCommitmentPublicApi.getRentalNotificationContext({
        tenantId: event.tenantId,
        rentalId: event.rentalId,
      });

      if (rentalResult.isErr()) {
        this.logger.warn(
          `Skipping rental confirmed notification for rental ${event.rentalId}: ${rentalResult.error.message}`,
          SendRentalConfirmedConfirmationNotificationHandler.name,
        );
        return;
      }

      const rental = rentalResult.value;
      if (!rental.rentalCustomerId) {
        this.logger.warn(
          `Skipping rental confirmed notification for rental ${event.rentalId}: rental has no customer.`,
          SendRentalConfirmedConfirmationNotificationHandler.name,
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
          `Skipping rental confirmed notification for rental ${event.rentalId}: ${tenantResult.error.message}`,
          SendRentalConfirmedConfirmationNotificationHandler.name,
        );
        return;
      }

      if (customerResult.isErr()) {
        this.logger.warn(
          `Skipping rental confirmed notification for rental ${event.rentalId}: ${customerResult.error.message}`,
          SendRentalConfirmedConfirmationNotificationHandler.name,
        );
        return;
      }

      const customer = customerResult.value;
      if (customer.deletedAt || !customer.isActive) {
        this.logger.warn(
          `Skipping rental confirmed notification for rental ${event.rentalId}: rental customer ${customer.id} is inactive or deleted.`,
          SendRentalConfirmedConfirmationNotificationHandler.name,
        );
        return;
      }

      if (branchContextResult.isErr()) {
        this.logger.warn(
          `Skipping rental confirmed notification for rental ${event.rentalId}: ${branchContextResult.error.message}`,
          SendRentalConfirmedConfirmationNotificationHandler.name,
        );
        return;
      }

      const pickup = formatDateTimeInTimezone(rental.periodStart, branchContextResult.value.effectiveTimezone);
      const returnAt = formatDateTimeInTimezone(rental.periodEnd, branchContextResult.value.effectiveTimezone);

      await this.notificationOrchestrator.dispatch({
        tenantId: rental.tenantId,
        notificationType: NotificationType.RENTAL_CONFIRMED_CONFIRMATION,
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
        metadata: {
          rentalId: rental.rentalId,
        },
        idempotencyKey: `rental-confirmed-confirmation:${rental.rentalId}`,
      });
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to handle ${RentalConfirmedEvent.name} for rental ${event.rentalId}.`,
        stack,
        SendRentalConfirmedConfirmationNotificationHandler.name,
      );
    }
  }
}
