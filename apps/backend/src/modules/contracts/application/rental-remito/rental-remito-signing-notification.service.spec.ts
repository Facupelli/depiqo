import { describe, expect, it, vi } from 'vitest';

import { NotificationDispatchSkipReason } from 'src/modules/notifications/application/types/notification-dispatch-skip-reason.enum';
import { NotificationChannel } from 'src/modules/notifications/domain/notification-channel.enum';

import {
  RentalRemitoSigningInvitationDeliveryFailedError,
  RentalRemitoSigningNotificationService,
} from './rental-remito-signing-notification.service';

const input = {
  tenant: { tenantId: 'tenant-1', name: 'Tenant', slug: 'tenant' },
  requestId: 'request-1',
  orderId: 'rental-1',
  documentNumber: 'R-1',
  rawToken: 'raw-token',
  tokenHash: 'token-hash',
  recipientEmail: 'signer@example.com',
  expiresAt: new Date('2030-01-01T00:00:00.000Z'),
  resend: false,
};

function createSubject(dispatchResult: {
  attemptedChannels: NotificationChannel[];
  deliveredChannels: NotificationChannel[];
  skippedChannels: Array<{
    channel: NotificationChannel;
    reason: NotificationDispatchSkipReason;
    message: string;
  }>;
  failedChannels: Array<{ channel: NotificationChannel; reason: string; message: string }>;
}) {
  // SAFETY: These focused test doubles implement every dependency member exercised by the notification service.
  return new RentalRemitoSigningNotificationService(
    { dispatch: vi.fn().mockResolvedValue(dispatchResult) } as never,
    { get: vi.fn().mockReturnValue('https://signing.example.com') } as never,
  );
}

describe('RentalRemitoSigningNotificationService', () => {
  it('reports provider acceptance as delivered and not suppressed', async () => {
    const service = createSubject({
      attemptedChannels: [NotificationChannel.EMAIL],
      deliveredChannels: [NotificationChannel.EMAIL],
      skippedChannels: [],
      failedChannels: [],
    });

    const result = await service.sendInvitation(input);

    expect(result.delivered).toBe(true);
    expect(result.suppressed).toBe(false);
    expect(result.deliveryError).toBeNull();
  });

  it.each([
    NotificationDispatchSkipReason.SUPPRESSED_BY_TENANT_COMMUNICATION_MODE,
    NotificationDispatchSkipReason.MUTED_BY_ENVIRONMENT,
  ])('reports %s as suppressed without a delivery error', async (reason) => {
    const service = createSubject({
      attemptedChannels: [],
      deliveredChannels: [],
      skippedChannels: [{ channel: NotificationChannel.EMAIL, reason, message: 'Email skipped.' }],
      failedChannels: [],
    });

    const result = await service.sendInvitation(input);

    expect(result.delivered).toBe(false);
    expect(result.suppressed).toBe(true);
    expect(result.deliveryError).toBeNull();
  });

  it('returns an unsuppressed delivery error for a provider failure', async () => {
    const service = createSubject({
      attemptedChannels: [NotificationChannel.EMAIL],
      deliveredChannels: [],
      skippedChannels: [],
      failedChannels: [
        {
          channel: NotificationChannel.EMAIL,
          reason: 'PROVIDER_REJECTED',
          message: 'Provider rejected the email.',
        },
      ],
    });

    const result = await service.sendInvitation(input);

    expect(result.delivered).toBe(false);
    expect(result.suppressed).toBe(false);
    expect(result.deliveryError).toBeInstanceOf(RentalRemitoSigningInvitationDeliveryFailedError);
  });
});
