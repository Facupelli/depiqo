import { V2NotificationChannel, V2NotificationDeliveryStatus } from 'src/generated/prisma/client';

import { NotificationChannelMutePolicy } from './notification-channel-mute-policy.service';
import { NotificationChannelPolicyResolver } from './notification-channel-policy.resolver';
import { NotificationOrchestrator } from './notification-orchestrator.service';
import { NotificationPersistenceService } from './notification-persistence.service';
import { EmailDeliveryPort } from './ports/email-delivery.port';
import { EmailRenderer } from './ports/email-renderer.port';
import { EmailSenderResolver } from './ports/email-sender.resolver';
import { TenantNotificationSuppressionPolicy } from './tenant-notification-suppression-policy.service';
import { NotificationDispatchRequest } from './types/notification-dispatch-request';
import { NotificationDispatchSkipReason } from './types/notification-dispatch-skip-reason.enum';
import { NotificationChannel } from '../domain/notification-channel.enum';
import { NotificationType } from '../domain/notification-type.enum';

const request: NotificationDispatchRequest = {
  tenantId: 'tenant-1',
  notificationType: NotificationType.RENTAL_CANCELLED,
  emailRecipients: [{ email: 'customer@example.com' }],
  payload: { tenantName: 'Depiqo' },
  source: {
    context: 'rental-commitment',
    aggregateType: 'Rental',
    aggregateId: 'rental-1',
    eventId: 'event-1',
  },
  idempotencyKey: 'rental-cancelled:rental-1',
};

describe('NotificationOrchestrator', () => {
  function createOrchestrator() {
    const channelPolicyResolver = {
      resolveChannels: jest.fn().mockResolvedValue([NotificationChannel.EMAIL]),
    } as unknown as NotificationChannelPolicyResolver;
    const channelMutePolicy = {
      isMuted: jest.fn().mockReturnValue(false),
    } as unknown as NotificationChannelMutePolicy;
    const tenantNotificationSuppressionPolicy = {
      evaluate: jest.fn().mockResolvedValue({ suppressed: false }),
    } as unknown as TenantNotificationSuppressionPolicy;
    const notificationPersistence = {
      createNotificationWithPendingDeliveries: jest.fn().mockResolvedValue({
        notificationId: 'notification-1',
        created: true,
        deliveries: [
          {
            id: 'delivery-1',
            channel: V2NotificationChannel.EMAIL,
            recipient: 'customer@example.com',
            status: V2NotificationDeliveryStatus.PENDING,
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        ],
      }),
      markDeliverySent: jest.fn().mockResolvedValue(true),
      markDeliveryFailed: jest.fn().mockResolvedValue(true),
    } as unknown as NotificationPersistenceService;
    const emailRenderer = {
      render: jest.fn().mockResolvedValue({
        subject: 'Rental cancelled',
        html: '<p>Rental cancelled</p>',
        text: 'Rental cancelled',
      }),
    } as unknown as EmailRenderer;
    const emailDeliveryPort = {
      send: jest.fn().mockResolvedValue({ success: true, provider: 'RESEND', providerMessageId: 'message-1' }),
    } as unknown as EmailDeliveryPort;
    const emailSenderResolver = {
      resolve: jest.fn().mockResolvedValue({ fromEmail: 'no-reply@example.com' }),
    } as unknown as EmailSenderResolver;

    return {
      orchestrator: new NotificationOrchestrator(
        channelPolicyResolver,
        channelMutePolicy,
        tenantNotificationSuppressionPolicy,
        notificationPersistence,
        emailRenderer,
        emailDeliveryPort,
        emailSenderResolver,
      ),
      channelPolicyResolver,
      channelMutePolicy,
      tenantNotificationSuppressionPolicy,
      notificationPersistence,
      emailRenderer,
      emailDeliveryPort,
    };
  }

  it('does not persist or send a suppressed notification', async () => {
    const { orchestrator, tenantNotificationSuppressionPolicy, notificationPersistence, emailDeliveryPort } =
      createOrchestrator();
    tenantNotificationSuppressionPolicy.evaluate = jest.fn().mockResolvedValue({
      suppressed: true,
      reason: NotificationDispatchSkipReason.SUPPRESSED_BY_TENANT_COMMUNICATION_MODE,
      message: 'Suppressed by tenant communication mode.',
    });

    await expect(orchestrator.dispatch(request)).resolves.toEqual({
      attemptedChannels: [],
      deliveredChannels: [],
      skippedChannels: [
        {
          channel: NotificationChannel.EMAIL,
          reason: NotificationDispatchSkipReason.SUPPRESSED_BY_TENANT_COMMUNICATION_MODE,
          message: 'Suppressed by tenant communication mode.',
        },
      ],
      failedChannels: [],
    });
    expect(notificationPersistence.createNotificationWithPendingDeliveries).not.toHaveBeenCalled();
    expect(emailDeliveryPort.send).not.toHaveBeenCalled();
  });

  it('does not persist or send a muted notification', async () => {
    const { orchestrator, channelMutePolicy, notificationPersistence, emailDeliveryPort } = createOrchestrator();
    channelMutePolicy.isMuted = jest.fn().mockReturnValue(true);

    await expect(orchestrator.dispatch(request)).resolves.toEqual({
      attemptedChannels: [],
      deliveredChannels: [],
      skippedChannels: [
        {
          channel: NotificationChannel.EMAIL,
          reason: NotificationDispatchSkipReason.MUTED_BY_ENVIRONMENT,
          message: 'Notification channel EMAIL is muted in the current environment.',
        },
      ],
      failedChannels: [],
    });
    expect(notificationPersistence.createNotificationWithPendingDeliveries).not.toHaveBeenCalled();
    expect(emailDeliveryPort.send).not.toHaveBeenCalled();
  });

  it('persists each recipient before sending it through the provider', async () => {
    const { orchestrator, notificationPersistence, emailDeliveryPort } = createOrchestrator();
    notificationPersistence.createNotificationWithPendingDeliveries = jest.fn().mockResolvedValue({
      notificationId: 'notification-1',
      created: true,
      deliveries: [
        {
          id: 'delivery-1',
          channel: V2NotificationChannel.EMAIL,
          recipient: 'first@example.com',
          status: V2NotificationDeliveryStatus.PENDING,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
        {
          id: 'delivery-2',
          channel: V2NotificationChannel.EMAIL,
          recipient: 'second@example.com',
          status: V2NotificationDeliveryStatus.PENDING,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      ],
    });

    await expect(
      orchestrator.dispatch({
        ...request,
        emailRecipients: [{ email: 'first@example.com' }, { email: 'second@example.com' }],
      }),
    ).resolves.toEqual({
      attemptedChannels: [NotificationChannel.EMAIL],
      deliveredChannels: [NotificationChannel.EMAIL],
      skippedChannels: [],
      failedChannels: [],
    });

    expect(notificationPersistence.createNotificationWithPendingDeliveries).toHaveBeenCalledWith(
      expect.objectContaining({
        source: request.source,
        deliveries: [
          { channel: V2NotificationChannel.EMAIL, recipient: 'first@example.com' },
          { channel: V2NotificationChannel.EMAIL, recipient: 'second@example.com' },
        ],
      }),
    );
    expect(emailDeliveryPort.send).toHaveBeenCalledTimes(2);
    expect(emailDeliveryPort.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        recipients: [{ email: 'first@example.com' }],
        idempotencyKey: `${request.idempotencyKey}:delivery-1`,
      }),
    );
    expect(emailDeliveryPort.send).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        recipients: [{ email: 'second@example.com' }],
        idempotencyKey: `${request.idempotencyKey}:delivery-2`,
      }),
    );
    expect(notificationPersistence.markDeliverySent).toHaveBeenCalledTimes(2);
  });

  it('marks a provider failure for its delivery and returns the channel failure', async () => {
    const { orchestrator, notificationPersistence, emailDeliveryPort } = createOrchestrator();
    emailDeliveryPort.send = jest.fn().mockResolvedValue({
      success: false,
      provider: 'RESEND',
      reason: 'PROVIDER_ERROR',
      message: 'Resend rejected the message.',
    });

    await expect(orchestrator.dispatch(request)).resolves.toEqual({
      attemptedChannels: [NotificationChannel.EMAIL],
      deliveredChannels: [],
      skippedChannels: [],
      failedChannels: [
        {
          channel: NotificationChannel.EMAIL,
          reason: 'PROVIDER_ERROR',
          message: 'Resend rejected the message.',
        },
      ],
    });
    expect(notificationPersistence.markDeliveryFailed).toHaveBeenCalledWith({
      tenantId: request.tenantId,
      deliveryId: 'delivery-1',
      provider: 'RESEND',
      errorCode: 'PROVIDER_ERROR',
      errorMessage: 'Resend rejected the message.',
    });
  });

  it('returns a persisted replay outcome without sending again', async () => {
    const { orchestrator, notificationPersistence, emailDeliveryPort } = createOrchestrator();
    notificationPersistence.createNotificationWithPendingDeliveries = jest.fn().mockResolvedValue({
      notificationId: 'notification-1',
      created: false,
      deliveries: [
        {
          id: 'delivery-1',
          channel: V2NotificationChannel.EMAIL,
          recipient: 'customer@example.com',
          status: V2NotificationDeliveryStatus.FAILED,
          lastErrorCode: 'INVALID_MESSAGE',
          lastErrorMessage: 'Recipient was invalid.',
        },
      ],
    });

    await expect(orchestrator.dispatch(request)).resolves.toEqual({
      attemptedChannels: [],
      deliveredChannels: [],
      skippedChannels: [],
      failedChannels: [
        {
          channel: NotificationChannel.EMAIL,
          reason: 'INVALID_MESSAGE',
          message: 'Recipient was invalid.',
        },
      ],
    });
    expect(emailDeliveryPort.send).not.toHaveBeenCalled();
  });

  it('redacts sensitive values from the persisted HTML snapshot', async () => {
    const { orchestrator, notificationPersistence, emailRenderer } = createOrchestrator();
    emailRenderer.render = jest.fn().mockResolvedValue({
      subject: 'Sign',
      html: '<a href="https://tenant.example/sign?token=secret">Sign</a>',
      text: 'https://tenant.example/sign?token=secret',
    });

    await orchestrator.dispatch({
      ...request,
      notificationType: NotificationType.DOCUMENT_SIGNING_INVITATION,
      payload: {
        documentLabel: 'agreement',
        documentNumber: '1',
        signingUrl: 'https://tenant.example/sign?token=secret',
        expiresAt: new Date('2026-01-01T00:00:00.000Z'),
        isReplacement: false,
      },
      contentSnapshotRedactions: ['https://tenant.example/sign?token=secret'],
    });

    expect(notificationPersistence.createNotificationWithPendingDeliveries).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ body: '<a href="[REDACTED]">Sign</a>' }),
      }),
    );
  });
});
