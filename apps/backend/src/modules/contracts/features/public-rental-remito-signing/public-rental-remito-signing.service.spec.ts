import { ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';

import { V2ContractStatus, V2DocumentSigningRequestStatus } from 'src/generated/prisma/enums';

import { RENTAL_REMITO_ACCEPTANCE_TEXT_VERSION } from '../../application/rental-remito/rental-remito-acceptance-text.registry';
import { PublicRentalRemitoSigningService } from './public-rental-remito-signing.service';

describe('PublicRentalRemitoSigningService', () => {
  it('successfully signs a corrected pending request', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      v2Contract: {
        findUnique: vi.fn().mockResolvedValue({ status: V2ContractStatus.SIGNING_REQUESTED }),
        update: vi.fn(),
      },
      v2DocumentSigningRequest: { updateMany },
      v2DocumentSignatureAcceptance: { create: vi.fn() },
    };
    const prisma = {
      client: {
        v2DocumentSigningRequest: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'request-1',
            tenantId: 'tenant-1',
            contractId: 'contract-1',
            status: V2DocumentSigningRequestStatus.PENDING,
            expiresAt: new Date('2099-01-01T00:00:00.000Z'),
            signerName: 'Signer',
            signerEmail: 'signer@example.com',
            signerPhone: null,
            acceptanceTextVersion: RENTAL_REMITO_ACCEPTANCE_TEXT_VERSION,
            contract: { documentNumber: 'R-1' },
            unsignedArtifact: {
              id: 'artifact-1',
              storageKey: 'unsigned.pdf',
              fileName: 'unsigned.pdf',
              contentType: 'application/pdf',
              byteSize: 100,
              documentHash: 'unsigned-hash',
              storageStatus: 'AVAILABLE',
            },
          }),
        },
        $transaction: vi.fn((callback) => callback(tx)),
      },
    };
    // SAFETY: These focused test doubles implement every dependency member exercised by the signing path.
    const service = new PublicRentalRemitoSigningService(
      prisma as never,
      { create: vi.fn().mockResolvedValue(Buffer.from('signed')) } as never,
      {
        persist: vi.fn().mockResolvedValue(
          ok({ id: 'signed-artifact-1', documentHash: 'signed-hash' }),
        ),
      } as never,
      { getObjectBuffer: vi.fn().mockResolvedValue(Buffer.from('unsigned')) } as never,
      { get: vi.fn().mockReturnValue(3600) } as never,
    );

    const result = await service.accept({
      rawToken: 'raw-token',
      signatureImageDataUrl: 'data:image/png;base64,signature',
      acceptanceTextVersion: RENTAL_REMITO_ACCEPTANCE_TEXT_VERSION,
      accepted: true,
      acceptedIpAddress: null,
      acceptedUserAgent: null,
    });

    expect(result.isOk()).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: expect.arrayContaining([
              V2DocumentSigningRequestStatus.PENDING,
              V2DocumentSigningRequestStatus.SENT,
            ]),
          },
        }),
        data: expect.objectContaining({ status: V2DocumentSigningRequestStatus.SIGNED }),
      }),
    );
  });
});
