import { Injectable } from '@nestjs/common';
import { Prisma, V2NotificationChannel, V2NotificationDeliveryStatus } from 'src/generated/prisma/client';

import { PrismaService } from 'src/core/database/prisma.service';

import { NotificationType } from '../domain/notification-type.enum';

export interface NotificationSourceCorrelation {
  context: string;
  aggregateType: string;
  aggregateId: string;
  eventId?: string;
}

export interface SafeNotificationContentSnapshot {
  subject?: string;
  body: string;
  contentHash?: string;
}

export interface NotificationTemplateSnapshot {
  id?: string;
  key?: string;
  version?: number;
}

export interface PendingNotificationDelivery {
  channel: V2NotificationChannel;
  recipient: string;
}

export interface CreateNotificationWithPendingDeliveriesInput {
  tenantId: string;
  notificationType: NotificationType;
  content: SafeNotificationContentSnapshot;
  source?: NotificationSourceCorrelation;
  template?: NotificationTemplateSnapshot;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
  deliveries: readonly PendingNotificationDelivery[];
}

export interface PersistedNotificationDelivery {
  id: string;
  channel: V2NotificationChannel;
  recipient: string;
}

export interface CreateNotificationWithPendingDeliveriesResult {
  notificationId: string;
  created: boolean;
  deliveries: PersistedNotificationDelivery[];
}

/** Provider diagnostics must be normalized and safe to retain in the database. */
export type NormalizedProviderResult = Record<string, string | number | boolean | null>;

export interface MarkNotificationDeliverySentInput {
  tenantId: string;
  deliveryId: string;
  provider: string;
  providerMessageId?: string;
  providerResult?: NormalizedProviderResult;
}

export interface MarkNotificationDeliveryFailedInput {
  tenantId: string;
  deliveryId: string;
  provider: string;
  errorCode: string;
  errorMessage: string;
  providerResult?: NormalizedProviderResult;
}

@Injectable()
export class NotificationPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotificationWithPendingDeliveries(
    input: CreateNotificationWithPendingDeliveriesInput,
  ): Promise<CreateNotificationWithPendingDeliveriesResult> {
    try {
      const notification = await this.prisma.client.$transaction((tx) =>
        tx.v2Notification.create({
          data: {
            tenantId: input.tenantId,
            type: input.notificationType,
            template: input.template?.id ? { connect: { id: input.template.id } } : undefined,
            templateKey: input.template?.key,
            templateVersion: input.template?.version,
            subject: input.content.subject,
            body: input.content.body,
            sourceContext: input.source?.context,
            sourceAggregateType: input.source?.aggregateType,
            sourceAggregateId: input.source?.aggregateId,
            sourceEventId: input.source?.eventId,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata,
            contentHash: input.content.contentHash,
            deliveries: {
              create: input.deliveries.map((delivery) => ({
                tenantId: input.tenantId,
                channel: delivery.channel,
                recipient: delivery.recipient,
              })),
            },
          },
          select: {
            id: true,
            deliveries: {
              select: {
                id: true,
                channel: true,
                recipient: true,
              },
            },
          },
        }),
      );

      return {
        notificationId: notification.id,
        created: true,
        deliveries: notification.deliveries,
      };
    } catch (error) {
      if (!input.idempotencyKey || !this.isUniqueConstraintViolation(error)) {
        throw error;
      }

      const existingNotification = await this.prisma.client.v2Notification.findFirst({
        where: {
          tenantId: input.tenantId,
          idempotencyKey: input.idempotencyKey,
        },
        select: {
          id: true,
          deliveries: {
            select: {
              id: true,
              channel: true,
              recipient: true,
            },
          },
        },
      });

      if (!existingNotification) {
        throw error;
      }

      return {
        notificationId: existingNotification.id,
        created: false,
        deliveries: existingNotification.deliveries,
      };
    }
  }

  async markDeliverySent(input: MarkNotificationDeliverySentInput): Promise<boolean> {
    const attemptedAt = new Date();
    const result = await this.prisma.client.v2NotificationDelivery.updateMany({
      where: {
        id: input.deliveryId,
        tenantId: input.tenantId,
        status: V2NotificationDeliveryStatus.PENDING,
      },
      data: {
        status: V2NotificationDeliveryStatus.SENT,
        attemptCount: { increment: 1 },
        provider: input.provider,
        providerMessageId: input.providerMessageId,
        providerResult: input.providerResult as Prisma.InputJsonValue | undefined,
        lastAttemptAt: attemptedAt,
        sentAt: attemptedAt,
      },
    });

    return result.count === 1;
  }

  async markDeliveryFailed(input: MarkNotificationDeliveryFailedInput): Promise<boolean> {
    const attemptedAt = new Date();
    const result = await this.prisma.client.v2NotificationDelivery.updateMany({
      where: {
        id: input.deliveryId,
        tenantId: input.tenantId,
        status: V2NotificationDeliveryStatus.PENDING,
      },
      data: {
        status: V2NotificationDeliveryStatus.FAILED,
        attemptCount: { increment: 1 },
        provider: input.provider,
        providerResult: input.providerResult as Prisma.InputJsonValue | undefined,
        lastErrorCode: input.errorCode,
        lastErrorMessage: input.errorMessage,
        lastAttemptAt: attemptedAt,
        failedAt: attemptedAt,
      },
    });

    return result.count === 1;
  }

  private isUniqueConstraintViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
