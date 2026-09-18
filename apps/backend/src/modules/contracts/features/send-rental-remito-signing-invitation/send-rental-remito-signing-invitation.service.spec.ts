import { ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';

import {
  RentalRemitoSigningInvitationDeliveryFailedError,
  type RentalRemitoSigningInvitationDeliveryResult,
} from '../../application/rental-remito/rental-remito-signing-notification.service';
import { SendRentalRemitoSigningInvitationCommand } from './send-rental-remito-signing-invitation.command';
import { SendRentalRemitoSigningInvitationService } from './send-rental-remito-signing-invitation.service';

const prepared = {
  contractId: 'contract-1',
  unsignedArtifactId: 'artifact-1',
  customerEmail: 'signer@example.com',
  documentNumber: 'R-1',
  documentHash: 'document-hash',
};

function createSubject(delivery: RentalRemitoSigningInvitationDeliveryResult) {
  const signingRequestService = {
    createOrReuse: vi.fn().mockResolvedValue(
      ok({
        requestId: 'request-1',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        reusedExistingRequest: false,
      }),
    ),
    markSent: vi.fn(),
    markFailed: vi.fn(),
  };
  const signingNotificationService = { sendInvitation: vi.fn().mockResolvedValue(delivery) };
  // SAFETY: These focused test doubles implement every dependency member exercised by the service.
  const service = new SendRentalRemitoSigningInvitationService(
    { execute: vi.fn().mockResolvedValue(ok(prepared)) } as never,
    signingRequestService as never,
    signingNotificationService as never,
    { getTenantIdentityFacts: vi.fn().mockResolvedValue(ok({ tenantId: 'tenant-1', name: 'Tenant' })) } as never,
    { get: vi.fn().mockReturnValue(3600) } as never,
  );

  return { service, signingRequestService };
}

const command = new SendRentalRemitoSigningInvitationCommand('tenant-1', 'rental-1', undefined);

describe('SendRentalRemitoSigningInvitationService', () => {
  it('marks the pending request sent after the email provider accepts it', async () => {
    const { service, signingRequestService } = createSubject({
      signingUrl: 'https://example.com/signing',
      delivered: true,
      suppressed: false,
      failureReason: null,
      failureMessage: null,
      deliveryError: null,
    });

    const result = await service.execute(command);

    expect(result.isOk()).toBe(true);
    const attemptTokenHash = signingRequestService.createOrReuse.mock.calls[0]?.[0].tokenHash;
    expect(attemptTokenHash).toEqual(expect.any(String));
    expect(signingRequestService.markSent).toHaveBeenCalledWith('request-1', attemptTokenHash);
    expect(signingRequestService.markFailed).not.toHaveBeenCalled();
  });

  it('marks the pending request failed when dispatch fails', async () => {
    const deliveryError = new RentalRemitoSigningInvitationDeliveryFailedError(
      'provider rejected the invitation',
    );
    const { service, signingRequestService } = createSubject({
      signingUrl: 'https://example.com/signing',
      delivered: false,
      suppressed: false,
      failureReason: 'PROVIDER_REJECTED',
      failureMessage: deliveryError.message,
      deliveryError,
    });

    const result = await service.execute(command);

    expect(result.isErr()).toBe(true);
    const attemptTokenHash = signingRequestService.createOrReuse.mock.calls[0]?.[0].tokenHash;
    expect(attemptTokenHash).toEqual(expect.any(String));
    expect(signingRequestService.markFailed).toHaveBeenCalledWith('request-1', attemptTokenHash);
    expect(signingRequestService.markSent).not.toHaveBeenCalled();
  });

  it('leaves a suppressed invitation pending', async () => {
    const { service, signingRequestService } = createSubject({
      signingUrl: 'https://example.com/signing',
      delivered: false,
      suppressed: true,
      failureReason: null,
      failureMessage: null,
      deliveryError: null,
    });

    const result = await service.execute(command);

    expect(result.isOk()).toBe(true);
    expect(signingRequestService.markSent).not.toHaveBeenCalled();
    expect(signingRequestService.markFailed).not.toHaveBeenCalled();
  });
});
