import { Prisma, V2NotificationChannel, V2NotificationDeliveryStatus } from 'src/generated/prisma/client';

import { PrismaService } from 'src/core/database/prisma.service';

import { NotificationType } from '../domain/notification-type.enum';
import { NotificationPersistenceService } from './notification-persistence.service';

describe('NotificationPersistenceService', () => {
  function createService() {
    const tx = {
      v2Notification: {
        create: jest.fn(),
      },
    };
    const prisma = {
      client: {
        $transaction: jest.fn(async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx)),
        v2Notification: {
          findFirst: jest.fn(),
        },
        v2NotificationDelivery: {
          updateMany: jest.fn(),
        },
      },
    } as unknown as PrismaService;

    return {
      service: new NotificationPersistenceService(prisma),
      tx,
      prisma,
    };
  }

  it('creates a notification and one pending delivery per recipient', async () => {
    const { service, tx } = createService();
    tx.v2Notification.create.mockResolvedValue({
      id: 'notification-1',
      deliveries: [
        { id: 'delivery-1', channel: V2NotificationChannel.EMAIL, recipient: 'first@example.com' },
        { id: 'delivery-2', channel: V2NotificationChannel.EMAIL, recipient: 'second@example.com' },
      ],
    });

    const result = await service.createNotificationWithPendingDeliveries({
      tenantId: 'tenant-1',
      notificationType: NotificationType.RENTAL_CANCELLED,
      content: { subject: 'Rental cancelled', body: '<p>Rental cancelled</p>', contentHash: 'hash' },
      source: {
        context: 'rental-commitment',
        aggregateType: 'Rental',
        aggregateId: 'rental-1',
        eventId: 'event-1',
      },
      metadata: { rentalId: 'rental-1' },
      idempotencyKey: 'rental-cancelled:rental-1',
      deliveries: [
        { channel: V2NotificationChannel.EMAIL, recipient: 'first@example.com' },
        { channel: V2NotificationChannel.EMAIL, recipient: 'second@example.com' },
      ],
    });

    expect(result).toEqual({
      notificationId: 'notification-1',
      created: true,
      deliveries: [
        { id: 'delivery-1', channel: V2NotificationChannel.EMAIL, recipient: 'first@example.com' },
        { id: 'delivery-2', channel: V2NotificationChannel.EMAIL, recipient: 'second@example.com' },
      ],
    });
    expect(tx.v2Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          type: NotificationType.RENTAL_CANCELLED,
          sourceContext: 'rental-commitment',
          sourceAggregateType: 'Rental',
          sourceAggregateId: 'rental-1',
          sourceEventId: 'event-1',
          deliveries: {
            create: [
              { tenantId: 'tenant-1', channel: V2NotificationChannel.EMAIL, recipient: 'first@example.com' },
              { tenantId: 'tenant-1', channel: V2NotificationChannel.EMAIL, recipient: 'second@example.com' },
            ],
          },
        }),
      }),
    );
  });

  it('returns the existing notification after an idempotency conflict', async () => {
    const { service, tx, prisma } = createService();
    tx.v2Notification.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed.', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    prisma.client.v2Notification.findFirst.mockResolvedValue({
      id: 'notification-1',
      deliveries: [{ id: 'delivery-1', channel: V2NotificationChannel.EMAIL, recipient: 'customer@example.com' }],
    });

    await expect(
      service.createNotificationWithPendingDeliveries({
        tenantId: 'tenant-1',
        notificationType: NotificationType.RENTAL_CANCELLED,
        content: { body: '<p>Rental cancelled</p>' },
        idempotencyKey: 'rental-cancelled:rental-1',
        deliveries: [{ channel: V2NotificationChannel.EMAIL, recipient: 'customer@example.com' }],
      }),
    ).resolves.toEqual({
      notificationId: 'notification-1',
      created: false,
      deliveries: [{ id: 'delivery-1', channel: V2NotificationChannel.EMAIL, recipient: 'customer@example.com' }],
    });
  });

  it('records a sent outcome only from pending and increments attempts once', async () => {
    const { service, prisma } = createService();
    prisma.client.v2NotificationDelivery.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.markDeliverySent({
        tenantId: 'tenant-1',
        deliveryId: 'delivery-1',
        provider: 'RESEND',
        providerMessageId: 'provider-message-1',
      }),
    ).resolves.toBe(true);

    expect(prisma.client.v2NotificationDelivery.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'delivery-1',
        tenantId: 'tenant-1',
        status: V2NotificationDeliveryStatus.PENDING,
      },
      data: expect.objectContaining({
        status: V2NotificationDeliveryStatus.SENT,
        attemptCount: { increment: 1 },
        provider: 'RESEND',
        providerMessageId: 'provider-message-1',
      }),
    });
  });

  it('does not overwrite a non-pending delivery outcome', async () => {
    const { service, prisma } = createService();
    prisma.client.v2NotificationDelivery.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.markDeliveryFailed({
        tenantId: 'tenant-1',
        deliveryId: 'delivery-1',
        provider: 'RESEND',
        errorCode: 'PROVIDER_ERROR',
        errorMessage: 'Provider rejected the message.',
      }),
    ).resolves.toBe(false);

    expect(prisma.client.v2NotificationDelivery.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'delivery-1',
        tenantId: 'tenant-1',
        status: V2NotificationDeliveryStatus.PENDING,
      },
      data: expect.objectContaining({
        status: V2NotificationDeliveryStatus.FAILED,
        attemptCount: { increment: 1 },
        lastErrorCode: 'PROVIDER_ERROR',
        lastErrorMessage: 'Provider rejected the message.',
      }),
    });
  });
});
