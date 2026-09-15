import { randomUUID } from 'node:crypto';

import { CommandBus } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import { parsePostgresRange } from 'src/core/utils/postgres-range.util';
import { Prisma } from 'src/generated/prisma/client';
import {
  createRentalCommitmentIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { RentalRepository } from '../../persistence/rental.repository';
import { CommittedRentalSelectionsAndDemand } from '../../public-api/committed-rental-selections-and-demand.public-api';
import { ConfirmedRentalEditedIntegrationEvent } from '../../public-api/events/rental-lifecycle.integration-events';
import { RentalPhysicalAssignments } from '../../public-api/rental-physical-assignments.public-api';
import { ConfirmedRentalFixtures } from '../../testing/confirmed-rental.fixtures';
import { ConfirmRentalFixtures } from '../confirm-rental/testing/confirm-rental.fixtures';
import { RemoveConfirmedPackageDemandLineCommand } from './remove-confirmed-package-demand-line.command';
import { RemoveConfirmedPackageDemandLineResult } from './remove-confirmed-package-demand-line.handler';

describe('RemoveConfirmedPackageDemandLine integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let bus: CommandBus;
  let emitter: EventEmitter2;
  let core: TestFixtures;
  let fixtures: ConfirmedRentalFixtures;
  let rentalFixtures: ConfirmRentalFixtures;

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    bus = moduleRef.get(CommandBus);
    emitter = moduleRef.get(EventEmitter2);
    core = createTestFixtures(prisma);
    fixtures = new ConfirmedRentalFixtures(prisma);
    rentalFixtures = new ConfirmRentalFixtures(prisma);
    return moduleRef;
  });

  async function scenario(
    options: {
      period?: { start: Date; end: Date };
      kind?: 'PACKAGE' | 'SINGLE';
      demandCount?: number;
      thirdPartyDemandIndex?: number;
    } = {},
  ) {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const { user } = await core.createTenantUser({ tenantId: tenant.id });
    const now = Date.now();
    const period = options.period ?? { start: new Date(now + 3_600_000), end: new Date(now + 7_200_000) };
    const demandCount = options.demandCount ?? 3;
    const rental = await rentalFixtures.createRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period,
      status: 'CONFIRMED',
      demands: Array.from({ length: demandCount }, () => ({})),
    });
    const selectionId = rental.selectionIds[0];
    const priceSnapshot = rentalFixtures.priceSnapshot([selectionId]);

    await prisma.client.$transaction(async (tx) => {
      await tx.v2RentalDemandLine.updateMany({
        where: { rentalId: rental.rentalId },
        data: { rentalSelectionId: selectionId },
      });
      await tx.v2RentalSelection.deleteMany({
        where: { rentalId: rental.rentalId, id: { not: selectionId } },
      });
      await tx.v2RentalSelection.update({
        where: { id: selectionId },
        data: { rentableItemKindSnapshot: options.kind ?? 'PACKAGE', quantity: 1 },
      });
      await tx.v2Rental.update({
        where: { id: rental.rentalId },
        data: {
          priceSnapshot,
          acceptedCustomerTotal: '100.00',
          acceptedBeforeBufferMinutes: 10,
          acceptedAfterBufferMinutes: 15,
        },
      });
    });

    const assetIds: string[] = [];
    for (let index = 0; index < demandCount; index += 1) {
      const assetId = await rentalFixtures.createCandidate({
        tenantId: tenant.id,
        branchId: branch.id,
        equipmentTypeId: rental.equipmentTypeIds[index],
      });
      assetIds.push(assetId);
      const ownershipSnapshot =
        options.thirdPartyDemandIndex === index
          ? {
              kind: 'THIRD_PARTY',
              ownerId: `owner-${index}`,
              contractId: `contract-${index}`,
              basis: 'NET',
              ownerShare: '0.25',
            }
          : { kind: 'TENANT_OWNED' };
      await prisma.client.v2AssignedAsset.create({
        data: {
          tenantId: tenant.id,
          rentalId: rental.rentalId,
          rentalDemandLineId: rental.demandLineIds[index],
          assetId,
          ownershipSnapshot,
          effectiveFrom: period.start,
        },
      });
      await rentalFixtures.createActiveBlock({
        tenantId: tenant.id,
        rentalId: rental.rentalId,
        assetId,
        period: {
          start: new Date(period.start.getTime() - 10 * 60_000),
          end: new Date(period.end.getTime() + 15 * 60_000),
        },
      });
    }

    if (options.thirdPartyDemandIndex !== undefined) {
      const state = await fixtures.persistedState(rental.rentalId);
      const assignment = state.rental.assignedAssets.find(
        (item) => item.rentalDemandLineId === rental.demandLineIds[options.thirdPartyDemandIndex!],
      )!;
      await prisma.client.v2RentalOwnerSplit.create({
        data: {
          tenantId: tenant.id,
          rentalId: rental.rentalId,
          rentalSelectionId: selectionId,
          rentalDemandLineId: assignment.rentalDemandLineId,
          assignedAssetId: assignment.id,
          assetId: assignment.assetId,
          ownerId: `owner-${options.thirdPartyDemandIndex}`,
          contractId: `contract-${options.thirdPartyDemandIndex}`,
          basis: 'NET',
          ownerShare: '0.25',
          basisAmount: '100.00',
          ownerAmount: '25.00',
          currency: 'USD',
        },
      });
    }

    return { tenant, branch, customer, user, period, rental, selectionId, assetIds };
  }

  function remove(
    setup: Awaited<ReturnType<typeof scenario>>,
    demandLineId: string,
    expectedVersion: number,
  ): Promise<RemoveConfirmedPackageDemandLineResult> {
    return bus.execute(
      new RemoveConfirmedPackageDemandLineCommand({
        tenantId: setup.tenant.id,
        tenantUserId: setup.user.id,
        rentalId: setup.rental.rentalId,
        demandLineId,
        expectedVersion,
      }),
    );
  }

  it('removes one future package child while preserving commercial and pricing truth and current public reads', async () => {
    const setup = await scenario();
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const targetId = setup.rental.demandLineIds[1];
    const targetAssignment = before.rental.assignedAssets.find((item) => item.rentalDemandLineId === targetId)!;
    const siblingAssignments = before.rental.assignedAssets.filter((item) => item.rentalDemandLineId !== targetId);
    const siblingBlocks = before.blocks.filter((item) => item.assetId !== targetAssignment.assetId);
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      expect((await remove(setup, targetId, before.rental.version)).isOk()).toBe(true);
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }

    const after = await fixtures.persistedState(setup.rental.rentalId);
    expect(after.rental.version).toBe(before.rental.version + 1);
    expect(after.rental.selections).toEqual([
      expect.objectContaining({ id: setup.selectionId, quantity: 1, removedAt: null }),
    ]);
    expect(after.rental.demandLines.find((item) => item.id === targetId)).toMatchObject({
      removedQuantity: 1,
      removedAt: expect.any(Date),
    });
    expect(
      after.rental.demandLines.filter((item) => item.id !== targetId).every((item) => item.removedAt === null),
    ).toBe(true);
    expect(after.rental.assignedAssets.some((item) => item.id === targetAssignment.id)).toBe(false);
    expect(after.blocks.some((item) => item.assetId === targetAssignment.assetId)).toBe(false);
    expect(after.rental.assignedAssets).toEqual(siblingAssignments);
    expect(after.blocks).toEqual(siblingBlocks);
    expect(after.rental.priceSnapshot).toEqual(before.rental.priceSnapshot);
    expect(after.rental.acceptedCustomerTotal).toEqual(before.rental.acceptedCustomerTotal);

    const reconstituted = await moduleRef.get(RentalRepository).findById(setup.tenant.id, setup.rental.rentalId);
    expect(reconstituted).not.toBeNull();
    expect(reconstituted?.currentSelections).toHaveLength(1);
    expect(reconstituted?.currentDemandLines.map(({ id }) => id)).toEqual(
      expect.arrayContaining(setup.rental.demandLineIds.filter((id) => id !== targetId)),
    );

    const committed = await moduleRef
      .get(CommittedRentalSelectionsAndDemand)
      .getCommittedRentalSelectionsAndDemand({ tenantId: setup.tenant.id, rentalId: setup.rental.rentalId });
    expect(committed.isOk()).toBe(true);
    if (committed.isOk()) {
      expect(committed.value.selections).toEqual([
        expect.objectContaining({ selectionId: setup.selectionId, rentableItemKindSnapshot: 'PACKAGE', quantity: 1 }),
      ]);
      expect(committed.value.demandLines.map(({ demandLineId }) => demandLineId)).toEqual(
        expect.arrayContaining(setup.rental.demandLineIds.filter((id) => id !== targetId)),
      );
      expect(committed.value.demandLines.map(({ demandLineId }) => demandLineId)).not.toContain(targetId);
    }
    const assignments = await moduleRef
      .get(RentalPhysicalAssignments)
      .getRentalPhysicalAssignments({ tenantId: setup.tenant.id, rentalId: setup.rental.rentalId });
    expect(assignments.isOk()).toBe(true);
    if (assignments.isOk()) {
      expect(assignments.value.demandAssignments.map(({ demandLineId }) => demandLineId)).not.toContain(targetId);
      expect(assignments.value.demandAssignments).toHaveLength(2);
    }
    expect(events).toEqual([
      expect.objectContaining({
        schemaVersion: 2,
        tenantId: setup.tenant.id,
        rentalId: setup.rental.rentalId,
        rentalCustomerId: setup.customer.id,
        branchId: setup.branch.id,
        status: 'CONFIRMED',
        fulfillmentMethod: 'PICKUP',
        periodStart: setup.period.start,
        periodEnd: setup.period.end,
      }),
    ]);
  });

  it('replaces owner splits from remaining fulfillment without changing accepted pricing', async () => {
    const setup = await scenario({ thirdPartyDemandIndex: 0 });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const oldSplit = before.rental.ownerSplits[0];
    expect(oldSplit).toBeDefined();
    expect((await remove(setup, setup.rental.demandLineIds[1], before.rental.version)).isOk()).toBe(true);
    const after = await fixtures.persistedState(setup.rental.rentalId);
    expect(after.rental.ownerSplits).toEqual([
      expect.objectContaining({
        rentalDemandLineId: setup.rental.demandLineIds[0],
        assignedAssetId: oldSplit.assignedAssetId,
        ownerId: 'owner-0',
        basisAmount: new Prisma.Decimal('50.00'),
        ownerAmount: new Prisma.Decimal('12.50'),
      }),
    ]);
    expect(after.rental.ownerSplits[0].id).not.toBe(oldSplit.id);
    expect(
      after.rental.ownerSplits.some(({ rentalDemandLineId }) => rentalDemandLineId === setup.rental.demandLineIds[1]),
    ).toBe(false);
    expect(after.rental.priceSnapshot).toEqual(before.rental.priceSnapshot);
    expect(after.rental.acceptedCustomerTotal).toEqual(before.rental.acceptedCustomerTotal);
  });

  it('preserves in-progress history and shortens only the removed child block through the after-buffer', async () => {
    const now = Date.now();
    const setup = await scenario({
      period: { start: new Date(now - 60_000), end: new Date(now + 3_600_000) },
    });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const targetId = setup.rental.demandLineIds[1];
    const targetAssignment = before.rental.assignedAssets.find((item) => item.rentalDemandLineId === targetId)!;
    const targetBlock = before.blocks.find((item) => item.assetId === targetAssignment.assetId)!;
    const siblingsBefore = before.rental.assignedAssets.filter((item) => item.rentalDemandLineId !== targetId);
    const siblingBlocksBefore = before.blocks.filter((item) => item.id !== targetBlock.id);

    expect((await remove(setup, targetId, before.rental.version)).isOk()).toBe(true);
    const after = await fixtures.persistedState(setup.rental.rentalId);
    const historical = after.rental.assignedAssets.find((item) => item.id === targetAssignment.id)!;
    const shortenedBlock = after.blocks.find((item) => item.id === targetBlock.id)!;
    expect(historical.effectiveUntil).toEqual(expect.any(Date));
    expect(shortenedBlock.releasedAt).toBeNull();
    expect(parsePostgresRange(shortenedBlock.period).end).toEqual(
      new Date(historical.effectiveUntil!.getTime() + 15 * 60_000),
    );
    expect(after.rental.assignedAssets.filter((item) => item.rentalDemandLineId !== targetId)).toEqual(siblingsBefore);
    expect(after.blocks.filter((item) => item.id !== targetBlock.id)).toEqual(siblingBlocksBefore);
    expect(after.rental.demandLines.find((item) => item.id === targetId)?.removedAt).toEqual(historical.effectiveUntil);
    const publicAssignments = await moduleRef
      .get(RentalPhysicalAssignments)
      .getRentalPhysicalAssignments({ tenantId: setup.tenant.id, rentalId: setup.rental.rentalId });
    expect(publicAssignments.isOk()).toBe(true);
    if (publicAssignments.isOk()) {
      expect(publicAssignments.value.demandAssignments.map(({ demandLineId }) => demandLineId)).not.toContain(targetId);
    }
  });

  it('rejects a stale version atomically and publishes no edit event', async () => {
    const setup = await scenario({ thirdPartyDemandIndex: 1 });
    const staleVersion = (await fixtures.persistedState(setup.rental.rentalId)).rental.version;
    await prisma.client.v2Rental.update({
      where: { id: setup.rental.rentalId },
      data: { notes: 'concurrent edit', version: { increment: 1 } },
    });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      const result = await remove(setup, setup.rental.demandLineIds[1], staleVersion);
      expect(result.isErr() && result.error.code).toBe('rental_commitment.rental_version_conflict');
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
    expect(events).toEqual([]);
  });

  it('rejects a current accessory reference atomically and publishes no edit event', async () => {
    const setup = await scenario({ thirdPartyDemandIndex: 1 });
    const targetId = setup.rental.demandLineIds[1];
    await fixtures.createAccessoryState({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      rentalId: setup.rental.rentalId,
      sourceRentalDemandLineId: targetId,
      period: setup.period,
    });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const accessoryBefore = await fixtures.accessoryState(setup.rental.rentalId);
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      const result = await remove(setup, targetId, before.rental.version);
      expect(result.isErr() && result.error.code).toBe('rental_commitment.rental_demand_line_referenced_by_accessory');
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
    expect(await fixtures.accessoryState(setup.rental.rentalId)).toEqual(accessoryBefore);
    expect(events).toEqual([]);
  });

  it.each([
    ['a SINGLE demand', { kind: 'SINGLE' as const, demandCount: 3 }, 0, 'rental_commitment.invalid_rental_field'],
    [
      'the final PACKAGE child',
      { kind: 'PACKAGE' as const, demandCount: 1 },
      0,
      'rental_commitment.invalid_rental_field',
    ],
    [
      'an unknown demand',
      { kind: 'PACKAGE' as const, demandCount: 3 },
      -1,
      'rental_commitment.rental_demand_line_not_found',
    ],
  ])('rejects %s through the application boundary without persistence changes', async (_name, options, index, code) => {
    const setup = await scenario(options);
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const demandLineId = index < 0 ? randomUUID() : setup.rental.demandLineIds[index];
    const result = await remove(setup, demandLineId, before.rental.version);
    expect(result.isErr() && result.error.code).toBe(code);
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it('maps an already removed demand to not found and leaves the second attempt unchanged', async () => {
    const setup = await scenario();
    const targetId = setup.rental.demandLineIds[1];
    const initial = await fixtures.persistedState(setup.rental.rentalId);
    expect((await remove(setup, targetId, initial.rental.version)).isOk()).toBe(true);
    const beforeRetry = await fixtures.persistedState(setup.rental.rentalId);
    const result = await remove(setup, targetId, beforeRetry.rental.version);
    expect(result.isErr() && result.error.code).toBe('rental_commitment.rental_demand_line_not_found');
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(beforeRetry);
  });
});
