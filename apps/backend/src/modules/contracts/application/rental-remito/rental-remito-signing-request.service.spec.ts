import { describe, expect, it, vi } from 'vitest';

import { V2DocumentSigningRequestStatus } from 'src/generated/prisma/enums';

import { RentalRemitoSigningRequestService } from './rental-remito-signing-request.service';

const input = {
  tenantId: 'tenant-1',
  contractId: 'contract-1',
  unsignedArtifactId: 'artifact-1',
  recipientEmail: 'signer@example.com',
  tokenHash: 'token-hash',
  expiresAt: new Date('2030-01-01T00:00:00.000Z'),
};

describe('RentalRemitoSigningRequestService', () => {
  it('creates a new request as pending', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'request-1', expiresAt: input.expiresAt });
    const tx = {
      v2DocumentSigningRequest: { findFirst: vi.fn().mockResolvedValue(null), create },
      v2Contract: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ rentalId: 'rental-1' }),
        update: vi.fn(),
      },
    };
    const prisma = {
      client: {
        v2ContractArtifact: { findFirst: vi.fn().mockResolvedValue({ id: 'artifact-1' }) },
        $transaction: vi.fn((callback) => callback(tx)),
      },
    };

    // SAFETY: This focused Prisma test double implements every member exercised by this scenario.
    const result = await new RentalRemitoSigningRequestService(prisma as never).createOrReuse(input);

    expect(result.isOk()).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: V2DocumentSigningRequestStatus.PENDING }) }),
    );
  });

  it('resets stale attempt timestamps when reusing an active request', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'request-1', expiresAt: input.expiresAt });
    const tx = {
      v2DocumentSigningRequest: {
        findFirst: vi.fn().mockResolvedValue({ id: 'request-1', expiresAt: new Date('2099-01-01T00:00:00.000Z') }),
        update,
      },
    };
    const prisma = {
      client: {
        v2ContractArtifact: { findFirst: vi.fn().mockResolvedValue({ id: 'artifact-1' }) },
        $transaction: vi.fn((callback) => callback(tx)),
      },
    };

    // SAFETY: This focused Prisma test double implements every member exercised by this scenario.
    await new RentalRemitoSigningRequestService(prisma as never).createOrReuse(input);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: V2DocumentSigningRequestStatus.PENDING,
          sentAt: null,
          viewedAt: null,
          failedAt: null,
        }),
      }),
    );
  });

  it('transitions a matching pending attempt to sent with one send timestamp', async () => {
    const sentAt = new Date('2026-03-12T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(sentAt);
    const updateMany = vi.fn();
    // SAFETY: This focused Prisma test double implements every member exercised by this scenario.
    const service = new RentalRemitoSigningRequestService({
      client: { v2DocumentSigningRequest: { updateMany } },
    } as never);

    await service.markSent('request-1', 'attempt-token-hash');

    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'request-1',
        status: V2DocumentSigningRequestStatus.PENDING,
        tokenHash: 'attempt-token-hash',
      },
      data: {
        status: V2DocumentSigningRequestStatus.SENT,
        sentAt,
        failedAt: null,
      },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'request-1',
        status: V2DocumentSigningRequestStatus.SIGNED,
        tokenHash: 'attempt-token-hash',
        sentAt: null,
      },
      data: { sentAt },
    });
    vi.useRealTimers();
  });

  it('fills sentAt for a matching signed attempt without changing signing state', async () => {
    const sentAt = new Date('2026-03-12T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(sentAt);
    const updateMany = vi.fn();
    // SAFETY: This focused Prisma test double implements every member exercised by this scenario.
    const service = new RentalRemitoSigningRequestService({
      client: { v2DocumentSigningRequest: { updateMany } },
    } as never);

    await service.markSent('request-1', 'attempt-token-hash');

    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'request-1',
        status: V2DocumentSigningRequestStatus.SIGNED,
        tokenHash: 'attempt-token-hash',
        sentAt: null,
      },
      data: { sentAt },
    });
    expect(updateMany.mock.calls[1]?.[0].data).not.toHaveProperty('status');
    expect(updateMany.mock.calls[1]?.[0].data).not.toHaveProperty('signedAt');
    vi.useRealTimers();
  });

  it('cannot update a newer attempt when the provider result has a stale token', async () => {
    const updateMany = vi.fn();
    // SAFETY: This focused Prisma test double implements every member exercised by this scenario.
    const service = new RentalRemitoSigningRequestService({
      client: { v2DocumentSigningRequest: { updateMany } },
    } as never);

    await service.markSent('request-1', 'stale-token-hash');

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: expect.objectContaining({ tokenHash: 'stale-token-hash' }) }),
    );
    expect(updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: expect.objectContaining({ tokenHash: 'stale-token-hash' }) }),
    );
  });

  it('records a failed dispatch without leaving the request sent', async () => {
    const updateMany = vi.fn();
    // SAFETY: This focused Prisma test double implements every member exercised by this scenario.
    const service = new RentalRemitoSigningRequestService({
      client: { v2DocumentSigningRequest: { updateMany } },
    } as never);

    await service.markFailed('request-1', 'attempt-token-hash');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'request-1',
        status: V2DocumentSigningRequestStatus.PENDING,
        tokenHash: 'attempt-token-hash',
      },
      data: {
        status: V2DocumentSigningRequestStatus.FAILED,
        sentAt: null,
        failedAt: expect.any(Date),
      },
    });
  });
});
