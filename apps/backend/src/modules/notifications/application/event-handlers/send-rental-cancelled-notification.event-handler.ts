import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PinoLogger } from 'nestjs-pino';

import { RentalCancelledIntegrationEvent } from 'src/modules/rental-commitment/public-api/events/rental-lifecycle.integration-events';
import { RentalCommitmentPublicApi } from 'src/modules/rental-commitment/public-api/rental-commitment.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';
import { TenantIdentityFacts } from 'src/modules/tenant-management/public-api/tenant-identity-facts.public-api';

import { NotificationType } from '../../domain/notification-type.enum';
import { NotificationOrchestrator } from '../notification-orchestrator.service';

@Injectable()
export class SendRentalCancelledNotificationHandler {
  private readonly logger = new Logger(SendRentalCancelledNotificationHandler.name);

  constructor(
    private readonly rentalCommitmentPublicApi: RentalCommitmentPublicApi,
    private readonly tenantManagementPublicApi: TenantManagementPublicApi,
    private readonly tenantIdentityFacts: TenantIdentityFacts,
    private readonly notificationOrchestrator: NotificationOrchestrator,
    private readonly structuredLogger: PinoLogger,
  ) {
    this.structuredLogger.setContext(SendRentalCancelledNotificationHandler.name);
  }

  @OnEvent(RentalCancelledIntegrationEvent.name)
  async handle(event: RentalCancelledIntegrationEvent): Promise<void> {
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
        this.tenantIdentityFacts.getTenantIdentityFacts({ tenantId: rental.tenantId }),
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
        source: {
          context: 'rental-commitment',
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventId: event.eventId,
        },
        metadata: {
          rentalId: rental.rentalId,
        },
        idempotencyKey: `rental-cancelled:${rental.rentalId}`,
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
