import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2ContractArtifactKind, V2ContractStatus, V2DocumentSigningRequestStatus } from 'src/generated/prisma/enums';
import { ConfirmedRentalEditedIntegrationEvent } from 'src/modules/rental-commitment/public-api/events/rental-lifecycle.integration-events';
import {
  createContractsIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { HandleConfirmedRentalEditedEventHandler } from './handle-confirmed-rental-edited.event-handler';

describe('HandleConfirmedRentalEditedEventHandler integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let core: TestFixtures;
  let handler: HandleConfirmedRentalEditedEventHandler;

  useIntegrationTestContext(async () => {
    moduleRef = await createContractsIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    core = createTestFixtures(prisma);
    handler = moduleRef.get(HandleConfirmedRentalEditedEventHandler);
    return moduleRef;
  });

  it.each([
    [V2ContractStatus.GENERATED, V2ContractStatus.DRAFT],
    [V2ContractStatus.SIGNED, V2ContractStatus.RESIGN_REQUIRED],
    [V2ContractStatus.DRAFT, V2ContractStatus.DRAFT],
    [V2ContractStatus.RESIGN_REQUIRED, V2ContractStatus.RESIGN_REQUIRED],
    [V2ContractStatus.VOID, V2ContractStatus.VOID],
  ])('moves %s to %s for a generic confirmed-rental edit', async (initialStatus, expectedStatus) => {
    const tenant = await core.createTenant();
    const rentalId = randomUUID();
    const contract = await prisma.client.v2Contract.create({
      data: { tenantId: tenant.id, rentalId, status: initialStatus },
    });

    await handler.handle(eventFor(tenant.id, rentalId));

    expect(await prisma.client.v2Contract.findUniqueOrThrow({ where: { id: contract.id } })).toEqual(
      expect.objectContaining({ status: expectedStatus }),
    );
  });

  it('cancels active signing requests and returns SIGNING_REQUESTED to DRAFT', async () => {
    const tenant = await core.createTenant();
    const rentalId = randomUUID();
    const contract = await prisma.client.v2Contract.create({
      data: { tenantId: tenant.id, rentalId, status: V2ContractStatus.SIGNING_REQUESTED },
    });
    const artifact = await prisma.client.v2ContractArtifact.create({
      data: {
        tenantId: tenant.id,
        contractId: contract.id,
        kind: V2ContractArtifactKind.UNSIGNED_PDF,
        storageKey: `contracts/${contract.id}/unsigned.pdf`,
        fileName: 'unsigned.pdf',
        contentType: 'application/pdf',
        byteSize: 10,
        hashAlgorithm: 'SHA-256',
        documentHash: randomUUID(),
      },
    });
    const statuses = Object.values(V2DocumentSigningRequestStatus);
    const statusByEmail = new Map(statuses.map((status) => [`${status.toLowerCase()}@test.local`, status]));
    await Promise.all(
      statuses.map((status) =>
        prisma.client.v2DocumentSigningRequest.create({
          data: {
            tenantId: tenant.id,
            contractId: contract.id,
            rentalId,
            unsignedArtifactId: artifact.id,
            signerName: 'Test signer',
            signerEmail: `${status.toLowerCase()}@test.local`,
            tokenHash: randomUUID(),
            status,
          },
        }),
      ),
    );

    await handler.handle(eventFor(tenant.id, rentalId));

    expect(await prisma.client.v2Contract.findUniqueOrThrow({ where: { id: contract.id } })).toEqual(
      expect.objectContaining({ status: V2ContractStatus.DRAFT }),
    );
    const requests = await prisma.client.v2DocumentSigningRequest.findMany({
      where: { contractId: contract.id },
      orderBy: { signerEmail: 'asc' },
    });
    for (const request of requests) {
      const originalStatus = statusByEmail.get(request.signerEmail!)!;
      const wasActive = [
        V2DocumentSigningRequestStatus.PENDING,
        V2DocumentSigningRequestStatus.SENT,
        V2DocumentSigningRequestStatus.VIEWED,
      ].includes(originalStatus);
      expect(request.status).toBe(wasActive ? V2DocumentSigningRequestStatus.CANCELLED : originalStatus);
      expect(request.cancelledAt).toEqual(wasActive ? expect.any(Date) : null);
    }
  });
});

function eventFor(tenantId: string, rentalId: string): ConfirmedRentalEditedIntegrationEvent {
  return new ConfirmedRentalEditedIntegrationEvent(
    tenantId,
    rentalId,
    randomUUID(),
    randomUUID(),
    'CONFIRMED',
    'PICKUP',
    new Date('2030-01-02T10:00:00.000Z'),
    new Date('2030-01-03T10:00:00.000Z'),
  );
}
