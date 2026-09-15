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
import { RemoveConfirmedPackageDemandLineCommand } from '../remove-confirmed-package-demand-line/remove-confirmed-package-demand-line.command';
import { RemoveConfirmedPackageDemandLineResult } from '../remove-confirmed-package-demand-line/remove-confirmed-package-demand-line.handler';
import { RestoreConfirmedPackageDemandLineCommand } from './restore-confirmed-package-demand-line.command';
import { RestoreConfirmedPackageDemandLineResult } from './restore-confirmed-package-demand-line.handler';

describe('RestoreConfirmedPackageDemandLine integration', () => {
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

  afterEach(() => jest.useRealTimers());

  async function scenario(options: { period?: { start: Date; end: Date }; kind?: 'PACKAGE' | 'SINGLE' } = {}) {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const { user } = await core.createTenantUser({ tenantId: tenant.id });
    const period = options.period ?? {
      start: new Date('2030-02-01T10:00:00.000Z'),
      end: new Date('2030-02-03T10:00:00.000Z'),
    };
    const rental = await rentalFixtures.createRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period,
      status: 'CONFIRMED',
      demands: [{}, {}, {}],
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
        data: { rentableItemKindSnapshot: options.kind ?? 'PACKAGE', quantity: 2 },
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
    for (let index = 0; index < rental.demandLineIds.length; index += 1) {
      const assetId = await rentalFixtures.createCandidate({
        tenantId: tenant.id,
        branchId: branch.id,
        equipmentTypeId: rental.equipmentTypeIds[index],
      });
      assetIds.push(assetId);
      await prisma.client.v2AssignedAsset.create({
        data: {
          tenantId: tenant.id,
          rentalId: rental.rentalId,
          rentalDemandLineId: rental.demandLineIds[index],
          assetId,
          ownershipSnapshot: { kind: 'TENANT_OWNED' },
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
    return { tenant, branch, customer, user, period, rental, selectionId, assetIds };
  }

  type Setup = Awaited<ReturnType<typeof scenario>>;

  function remove(
    setup: Setup,
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

  function restore(
    setup: Setup,
    demandLineId: string,
    expectedVersion: number,
  ): Promise<RestoreConfirmedPackageDemandLineResult> {
    return bus.execute(
      new RestoreConfirmedPackageDemandLineCommand({
        tenantId: setup.tenant.id,
        tenantUserId: setup.user.id,
        rentalId: setup.rental.rentalId,
        demandLineId,
        expectedVersion,
      }),
    );
  }

  async function removeAt(setup: Setup, demandLineId: string, time: Date) {
    jest
      .useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'] })
      .setSystemTime(time);
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const result = await remove(setup, demandLineId, before.rental.version);
    expect(result.isOk()).toBe(true);
    return fixtures.persistedState(setup.rental.rentalId);
  }

  it('restores the same future package demand row, preserves all accepted pricing, and publishes current capabilities once', async () => {
    const setup = await scenario();
    const targetId = setup.rental.demandLineIds[1];
    const removed = await removeAt(setup, targetId, new Date('2030-01-20T10:00:00.000Z'));
    const removedAssignmentIds = removed.rental.assignedAssets.map(({ id }) => id);
    const siblingAssignments = removed.rental.assignedAssets;
    const siblingBlocks = removed.blocks;
    const candidateId = await rentalFixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.rental.equipmentTypeIds[1],
    });
    await prisma.client.v2RentalAssetCandidate.update({
      where: { tenantId_assetId: { tenantId: setup.tenant.id, assetId: setup.assetIds[1] } },
      data: { assetStatus: 'INACTIVE' },
    });

    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    jest.setSystemTime(new Date('2030-01-21T10:00:00.000Z'));
    try {
      expect((await restore(setup, targetId, removed.rental.version)).isOk()).toBe(true);
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }

    const after = await fixtures.persistedState(setup.rental.rentalId);
    const restoredAssignment = after.rental.assignedAssets.find(
      (item) => item.rentalDemandLineId === targetId && item.effectiveUntil === null,
    )!;
    expect(after.rental.version).toBe(removed.rental.version + 1);
    expect(after.rental.demandLines.filter(({ id }) => id === targetId)).toEqual([
      expect.objectContaining({ id: targetId, removedQuantity: 0, removedAt: null }),
    ]);
    expect(after.rental.selections).toEqual([
      expect.objectContaining({
        id: setup.selectionId,
        rentableItemKindSnapshot: 'PACKAGE',
        quantity: 2,
        removedAt: null,
      }),
    ]);
    expect(after.rental.demandLines.filter(({ id }) => id !== targetId)).toEqual(
      removed.rental.demandLines.filter(({ id }) => id !== targetId),
    );
    expect(after.rental.assignedAssets.filter(({ id }) => removedAssignmentIds.includes(id))).toEqual(
      siblingAssignments,
    );
    expect(after.blocks.filter(({ id }) => siblingBlocks.some((block) => block.id === id))).toEqual(siblingBlocks);
    expect(restoredAssignment.assetId).toBe(candidateId);
    expect(restoredAssignment.effectiveFrom).toEqual(setup.period.start);
    const restoredBlock = after.blocks.find(({ assetId }) => assetId === candidateId)!;
    expect(parsePostgresRange(restoredBlock.period)).toEqual({
      start: new Date('2030-02-01T09:50:00.000Z'),
      end: new Date('2030-02-03T10:15:00.000Z'),
    });
    expect(after.rental.priceSnapshot).toEqual(removed.rental.priceSnapshot);
    expect(after.rental.acceptedCustomerTotal).toEqual(removed.rental.acceptedCustomerTotal);
    expect(await moduleRef.get(RentalRepository).findById(setup.tenant.id, setup.rental.rentalId)).not.toBeNull();

    const committed = await moduleRef
      .get(CommittedRentalSelectionsAndDemand)
      .getCommittedRentalSelectionsAndDemand({ tenantId: setup.tenant.id, rentalId: setup.rental.rentalId });
    expect(committed.isOk() && committed.value.demandLines.map(({ demandLineId }) => demandLineId)).toEqual(
      expect.arrayContaining(setup.rental.demandLineIds),
    );
    const assignments = await moduleRef
      .get(RentalPhysicalAssignments)
      .getRentalPhysicalAssignments({ tenantId: setup.tenant.id, rentalId: setup.rental.rentalId });
    expect(assignments.isOk() && assignments.value.demandAssignments).toEqual(
      expect.arrayContaining([expect.objectContaining({ demandLineId: targetId, assignedAssetIds: [candidateId] })]),
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(expect.objectContaining({ tenantId: setup.tenant.id, rentalId: setup.rental.rentalId }));
  });

  it('restores during rental with new history while the old shortened block excludes its previous asset', async () => {
    const setup = await scenario({
      period: { start: new Date('2030-01-10T10:00:00.000Z'), end: new Date('2030-01-10T18:00:00.000Z') },
    });
    const targetId = setup.rental.demandLineIds[1];
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const oldAssignment = before.rental.assignedAssets.find(
      ({ rentalDemandLineId }) => rentalDemandLineId === targetId,
    )!;
    const oldBlock = before.blocks.find(({ assetId }) => assetId === oldAssignment.assetId)!;
    const siblings = before.rental.assignedAssets.filter(({ rentalDemandLineId }) => rentalDemandLineId !== targetId);
    const removedAt = new Date('2030-01-10T12:00:00.000Z');
    const removed = await removeAt(setup, targetId, removedAt);
    const shortenedBlock = removed.blocks.find(({ id }) => id === oldBlock.id)!;
    const alternateId = await rentalFixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.rental.equipmentTypeIds[1],
    });

    const restoreAt = new Date('2030-01-10T12:05:00.000Z');
    jest.setSystemTime(restoreAt);
    expect((await restore(setup, targetId, removed.rental.version)).isOk()).toBe(true);
    const after = await fixtures.persistedState(setup.rental.rentalId);
    const historical = after.rental.assignedAssets.find(({ id }) => id === oldAssignment.id)!;
    const current = after.rental.assignedAssets.find(
      ({ rentalDemandLineId, effectiveUntil }) => rentalDemandLineId === targetId && effectiveUntil === null,
    )!;
    expect(historical.effectiveUntil).toEqual(removedAt);
    expect(after.blocks.find(({ id }) => id === oldBlock.id)).toEqual(shortenedBlock);
    expect(current.id).not.toBe(oldAssignment.id);
    expect(current.assetId).toBe(alternateId);
    expect(current.effectiveFrom).toEqual(restoreAt);
    expect(parsePostgresRange(after.blocks.find(({ assetId }) => assetId === alternateId)!.period)).toEqual({
      start: restoreAt,
      end: new Date('2030-01-10T18:15:00.000Z'),
    });
    expect(after.rental.assignedAssets.filter(({ rentalDemandLineId }) => rentalDemandLineId !== targetId)).toEqual(
      siblings,
    );
    expect(after.rental.demandLines.find(({ id }) => id === targetId)?.removedAt).toBeNull();
  });

  it('rolls back insufficient availability completely and publishes no event', async () => {
    const setup = await scenario();
    const targetId = setup.rental.demandLineIds[1];
    await removeAt(setup, targetId, new Date('2030-01-20T10:00:00.000Z'));
    await prisma.client.v2RentalAssetCandidate.update({
      where: { tenantId_assetId: { tenantId: setup.tenant.id, assetId: setup.assetIds[1] } },
      data: { assetStatus: 'INACTIVE' },
    });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      const result = await restore(setup, targetId, before.rental.version);
      expect(result.isErr() && result.error.code).toBe('rental_commitment.insufficient_asset_availability');
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
    expect(events).toEqual([]);
  });

  it('recalculates third-party owner splits from restored current fulfillment without changing pricing', async () => {
    const setup = await scenario();
    const targetId = setup.rental.demandLineIds[1];
    const removed = await removeAt(setup, targetId, new Date('2030-01-20T10:00:00.000Z'));
    await prisma.client.v2RentalAssetCandidate.update({
      where: { tenantId_assetId: { tenantId: setup.tenant.id, assetId: setup.assetIds[1] } },
      data: { assetStatus: 'INACTIVE' },
    });
    const ownerId = randomUUID();
    const contractId = randomUUID();
    const candidateId = await rentalFixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.rental.equipmentTypeIds[1],
      overrides: {
        ownershipKind: 'THIRD_PARTY',
        ownerId,
        ownerContractSnapshot: { ownerId, contractId, ownerShare: 0.4, rentalShare: 0.6, basis: 'NET' },
      },
    });
    expect((await restore(setup, targetId, removed.rental.version)).isOk()).toBe(true);
    const after = await fixtures.persistedState(setup.rental.rentalId);
    const assignment = after.rental.assignedAssets.find(({ assetId }) => assetId === candidateId)!;
    expect(after.rental.ownerSplits).toEqual([
      expect.objectContaining({
        rentalDemandLineId: targetId,
        assignedAssetId: assignment.id,
        assetId: candidateId,
        ownerId,
        contractId,
        basis: 'NET',
        ownerShare: new Prisma.Decimal('0.4'),
      }),
    ]);
    expect(after.rental.priceSnapshot).toEqual(removed.rental.priceSnapshot);
    expect(after.rental.acceptedCustomerTotal).toEqual(removed.rental.acceptedCustomerTotal);
  });

  it('supports repeated remove, restore, and remove using one demand-line row and coherent history', async () => {
    const setup = await scenario();
    const targetId = setup.rental.demandLineIds[1];
    const firstRemovalAt = new Date('2030-01-20T10:00:00.000Z');
    const removed = await removeAt(setup, targetId, firstRemovalAt);
    expect(await moduleRef.get(RentalRepository).findById(setup.tenant.id, setup.rental.rentalId)).not.toBeNull();
    jest.setSystemTime(new Date('2030-01-21T10:00:00.000Z'));
    expect((await restore(setup, targetId, removed.rental.version)).isOk()).toBe(true);
    const restored = await fixtures.persistedState(setup.rental.rentalId);
    expect(restored.rental.demandLines.find(({ id }) => id === targetId)?.removedAt).toBeNull();
    expect(await moduleRef.get(RentalRepository).findById(setup.tenant.id, setup.rental.rentalId)).not.toBeNull();
    const secondRemovalAt = new Date('2030-01-22T10:00:00.000Z');
    const removedAgain = await removeAt(setup, targetId, secondRemovalAt);
    expect(removedAgain.rental.demandLines.filter(({ id }) => id === targetId)).toEqual([
      expect.objectContaining({ removedQuantity: 1, removedAt: secondRemovalAt }),
    ]);
    expect(
      removedAgain.rental.assignedAssets.filter(({ rentalDemandLineId }) => rentalDemandLineId === targetId),
    ).toHaveLength(0);
    expect(await moduleRef.get(RentalRepository).findById(setup.tenant.id, setup.rental.rentalId)).not.toBeNull();
  });

  it('rejects stale expectedVersion atomically before committing allocation or an event', async () => {
    const setup = await scenario();
    const targetId = setup.rental.demandLineIds[1];
    const removed = await removeAt(setup, targetId, new Date('2030-01-20T10:00:00.000Z'));
    await prisma.client.v2Rental.update({
      where: { id: setup.rental.rentalId },
      data: { notes: 'concurrent edit', version: { increment: 1 } },
    });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      const result = await restore(setup, targetId, removed.rental.version);
      expect(result.isErr() && result.error.code).toBe('rental_commitment.rental_version_conflict');
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
    expect(events).toEqual([]);
  });

  it.each([
    ['already-current demand', 'current', 'rental_commitment.rental_demand_line_already_current'],
    ['unknown demand', 'unknown', 'rental_commitment.rental_demand_line_not_found'],
    ['removed demand after the rental ended', 'ended', 'rental_commitment.rental_period_ended'],
  ])('rejects %s with state-error precedence and complete rollback', async (_name, state, code) => {
    const ended = state === 'ended';
    const setup = await scenario(
      ended
        ? {
            period: { start: new Date('2030-01-01T10:00:00.000Z'), end: new Date('2030-01-02T10:00:00.000Z') },
          }
        : {},
    );
    const targetId = setup.rental.demandLineIds[1];
    jest
      .useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'] })
      .setSystemTime(ended ? new Date('2029-12-20T10:00:00.000Z') : new Date('2030-01-20T10:00:00.000Z'));
    let expectedVersion = (await fixtures.persistedState(setup.rental.rentalId)).rental.version;
    if (state !== 'current' && state !== 'unknown') {
      expect((await remove(setup, targetId, expectedVersion)).isOk()).toBe(true);
      expectedVersion += 1;
    }
    if (state !== 'current' && state !== 'unknown') {
      await prisma.client.v2RentalAssetCandidate.update({
        where: { tenantId_assetId: { tenantId: setup.tenant.id, assetId: setup.assetIds[1] } },
        data: { assetStatus: 'INACTIVE' },
      });
    }
    if (ended) jest.setSystemTime(new Date('2030-01-03T10:00:00.000Z'));
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const result = await restore(setup, state === 'unknown' ? randomUUID() : targetId, expectedVersion);
    expect(result.isErr() && result.error.code).toBe(code);
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });
});
