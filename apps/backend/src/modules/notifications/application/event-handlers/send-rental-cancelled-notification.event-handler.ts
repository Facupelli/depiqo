import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AppLogger } from 'src/core/logger/app-logger.service';
import { RentalCancelledEvent } from 'src/modules/rental-commitment/public-api/events/rental-cancelled.event';
import { RentalCommitmentPublicApi } from 'src/modules/rental-commitment/public-api/rental-commitment.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { NotificationType } from '../../domain/notification-type.enum';
import { NotificationOrchestrator } from '../notification-orchestrator.service';

@Injectable()
export class SendRentalCancelledNotificationHandler {
  constructor(
    private readonly rentalCommitmentPublicApi: RentalCommitmentPublicApi,
    private readonly tenantManagementPublicApi: TenantManagementPublicApi,
    private readonly notificationOrchestrator: NotificationOrchestrator,
    private readonly logger: AppLogger,
  ) {}

  @OnEvent(RentalCancelledEvent.name, { async: true })
  async handle(event: RentalCancelledEvent): Promise<void> {
    try {
      const rentalResult = await this.rentalCommitmentPublicApi.getRentalNotificationContext({
        tenantId: event.tenantId,
        rentalId: event.rentalId,
      });

      if (rentalResult.isErr()) {
        this.logger.warn(
          `Skipping rental cancelled notification for rental ${event.rentalId}: ${rentalResult.error.message}`,
          SendRentalCancelledNotificationHandler.name,
        );
        return;
      }

      const rental = rentalResult.value;
      if (!rental.rentalCustomerId) {
        this.logger.warn(
          `Skipping rental cancelled notification for rental ${event.rentalId}: rental has no customer.`,
          SendRentalCancelledNotificationHandler.name,
        );
        return;
      }

      const [tenantResult, customerResult] = await Promise.all([
        this.tenantManagementPublicApi.getTenant({ tenantId: rental.tenantId }),
        this.tenantManagementPublicApi.getRentalCustomerNotificationRecipient({
          tenantId: rental.tenantId,
          rentalCustomerId: rental.rentalCustomerId,
        }),
      ]);

      if (tenantResult.isErr()) {
        this.logger.warn(
          `Skipping rental cancelled notification for rental ${event.rentalId}: ${tenantResult.error.message}`,
          SendRentalCancelledNotificationHandler.name,
        );
        return;
      }

      if (customerResult.isErr()) {
        this.logger.warn(
          `Skipping rental cancelled notification for rental ${event.rentalId}: ${customerResult.error.message}`,
          SendRentalCancelledNotificationHandler.name,
        );
        return;
      }

      const customer = customerResult.value;
      if (customer.deletedAt || !customer.isActive) {
        this.logger.warn(
          `Skipping rental cancelled notification for rental ${event.rentalId}: rental customer ${customer.id} is inactive or deleted.`,
          SendRentalCancelledNotificationHandler.name,
        );
        return;
      }

      await this.notificationOrchestrator.dispatch({
        tenantId: rental.tenantId,
        notificationType: NotificationType.RENTAL_CANCELLED,
        emailRecipients: [{ email: customer.email }],
        payload: {
          tenantName: tenantResult.value.name,
        },
        metadata: {
          rentalId: rental.rentalId,
        },
        idempotencyKey: `rental-cancelled:${rental.rentalId}`,
      });
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to handle ${RentalCancelledEvent.name} for rental ${event.rentalId}.`,
        stack,
        SendRentalCancelledNotificationHandler.name,
      );
    }
  }
}
