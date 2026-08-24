import { randomUUID } from 'node:crypto';

import { CommandBus } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2RentalStatus } from 'src/generated/prisma/enums';
import { createBarrier, runConcurrently } from '../../../../../test/support/concurrency';
import {
  createRentalCommitmentIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { utcDate } from '../../../../../test/support/time';
import { RentalRepository } from '../../persistence/rental.repository';
import { RentalCancelledIntegrationEvent } from '../../public-api/events/rental-lifecycle.integration-events';
import { ConfirmRentalCommand } from '../confirm-rental/confirm-rental.command';
import { ConfirmRentalResult } from '../confirm-rental/confirm-rental.handler';
import { ConfirmRentalFixtures } from '../confirm-rental/testing/confirm-rental.fixtures';
import { EditConfirmedRentalFixtures } from '../edit-confirmed-rental/testing/edit-confirmed-rental.fixtures';
import { CancelRentalCommand } from './cancel-rental.command';
import { CancelRentalResult } from './cancel-rental.handler';

describe('CancelRental integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let commandBus: CommandBus;
  let events: EventEmitter2;
  let core: TestFixtures;
  let rentals: ConfirmRentalFixtures;
  let confirmedRentals: EditConfirmedRentalFixtures;

  const period = { start: utcDate(2030, 1, 1, 10), end: utcDate(2030, 1, 1, 12) };

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    commandBus = moduleRef.get(CommandBus);
    events = moduleRef.get(EventEmitter2);
    core = createTestFixtures(prisma);
    rentals = new ConfirmRentalFixtures(prisma);
    confirmedRentals = new EditConfirmedRentalFixtures(prisma);
    return moduleRef;
  });

  async function context() {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    return { tenant, branch, customer };
  }

  async function unconfirmed(status: V2RentalStatus = 'DRAFT') {
    const setup = await context();
    const rental = await rentals.createRental({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      customerId: setup.customer.id,
      status,
      period,
    });
    return { ...setup, rental };
  }

  async function confirmed() {
    const setup = await context();
    const offer = await confirmedRentals.createOffer({ tenantId: setup.tenant.id, branchId: setup.branch.id });
    const rental = await confirmedRentals.createConfirmedRental({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      customerId: setup.customer.id,
      period,
      offerId: offer.offer.id,
      equipmentTypeId: offer.equipmentType.id,
    });
    return { ...setup, offer, rental };
  }

  function cancel(tenantId: string, rentalId: string): Promise<CancelRentalResult> {
    return commandBus.execute(new CancelRentalCommand(tenantId, rentalId));
  }

  it.each(['DRAFT', 'PENDING'] as const)('logically cancels %s while preserving commercial state', async (status) => {
    const setup = await unconfirmed(status);
    const before = await prisma.client.v2Rental.findUniqueOrThrow({
      where: { id: setup.rental.rentalId },
      include: { selections: true, demandLines: true },
    });

    expect((await cancel(setup.tenant.id, setup.rental.rentalId)).isOk()).toBe(true);

    const after = await prisma.client.v2Rental.findUniqueOrThrow({
      where: { id: setup.rental.rentalId },
      include: { selections: true, demandLines: true, assignedAssets: true },
    });
    expect(after.status).toBe('CANCELLED');
    expect(after.cancelledAt).not.toBeNull();
    expect(after.priceSnapshot).toEqual(before.priceSnapshot);
    expect(after.selections.map(({ id, quantity }) => ({ id, quantity }))).toEqual(
      before.selections.map(({ id, quantity }) => ({ id, quantity })),
    );
    expect(after.demandLines.map(({ id, quantity }) => ({ id, quantity }))).toEqual(
      before.demandLines.map(({ id, quantity }) => ({ id, quantity })),
    );
    expect(after.assignedAssets).toHaveLength(0);
    expect(await prisma.client.v2AssetBlock.count({ where: { rentalId: setup.rental.rentalId } })).toBe(0);
  });

  it('cancels a confirmed rental, releases every owned block, and preserves historical business facts', async () => {
    const setup = await confirmed();
    const alreadyReleasedAssetId = await confirmedRentals.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.offer.equipmentType.id,
    });
    const priorRelease = utcDate(2029, 12, 1, 9);
    const alreadyReleasedBlockId = await confirmedRentals.createActiveBlock({
      tenantId: setup.tenant.id,
      rentalId: setup.rental.rentalId,
      assetId: alreadyReleasedAssetId,
      period,
      releasedAt: priorRelease,
    });
    const persistedRental = await confirmedRentals.persistedState(setup.rental.rentalId);
    await prisma.client.v2RentalOwnerSplit.create({
      data: {
        tenantId: setup.tenant.id,
        rentalId: setup.rental.rentalId,
        rentalSelectionId: persistedRental.rental.selections[0].id,
        rentalDemandLineId: persistedRental.rental.demandLines[0].id,
        assignedAssetId: persistedRental.rental.assignedAssets[0].id,
        assetId: persistedRental.rental.assignedAssets[0].assetId,
        ownerId: randomUUID(),
        contractId: randomUUID(),
        basis: 'NET',
        ownerShare: '0.40',
        basisAmount: '100.00',
        ownerAmount: '40.00',
        currency: 'USD',
      },
    });
    const unrelated = await confirmed();
    const before = await confirmedRentals.persistedState(setup.rental.rentalId);
    const unrelatedBefore = await confirmedRentals.persistedState(unrelated.rental.rentalId);

    expect((await cancel(setup.tenant.id, setup.rental.rentalId)).isOk()).toBe(true);

    const after = await confirmedRentals.persistedState(setup.rental.rentalId);
    expect(after.rental.status).toBe('CANCELLED');
    expect(after.rental.cancelledAt).not.toBeNull();
    expect(after.blocks.every((block) => block.releasedAt !== null)).toBe(true);
    expect(after.blocks.find((block) => block.id === alreadyReleasedBlockId)?.releasedAt).toEqual(priorRelease);
    expect(
      after.blocks.map(({ id, assetId, period: blockPeriod, blockType }) => ({ id, assetId, blockPeriod, blockType })),
    ).toEqual(
      before.blocks.map(({ id, assetId, period: blockPeriod, blockType }) => ({ id, assetId, blockPeriod, blockType })),
    );
    expect(after.rental.priceSnapshot).toEqual(before.rental.priceSnapshot);
    expect(after.rental.selections.map((item) => item.id)).toEqual(before.rental.selections.map((item) => item.id));
    expect(after.rental.demandLines.map((item) => item.id)).toEqual(before.rental.demandLines.map((item) => item.id));
    expect(after.rental.assignedAssets.map((item) => ({ id: item.id, assetId: item.assetId }))).toEqual(
      before.rental.assignedAssets.map((item) => ({ id: item.id, assetId: item.assetId })),
    );
    expect(after.rental.ownerSplits).toEqual(before.rental.ownerSplits);
    expect(await confirmedRentals.persistedState(unrelated.rental.rentalId)).toEqual(unrelatedBefore);
  });

  it('preserves accessory facts while releasing accessory and equipment blocks', async () => {
    const setup = await confirmed();
    const accessoryAssetId = await confirmedRentals.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: randomUUID(),
    });
    const selection = await prisma.client.v2RentalAccessorySelection.create({
      data: {
        tenantId: setup.tenant.id,
        rentalOrderId: setup.rental.rentalId,
        equipmentTypeId: randomUUID(),
        equipmentTypeNameSnapshot: 'Historical accessory',
        quantity: 1,
      },
    });
    const assignment = await prisma.client.v2RentalAccessoryAssetAssignment.create({
      data: {
        tenantId: setup.tenant.id,
        rentalOrderId: setup.rental.rentalId,
        rentalAccessorySelectionId: selection.id,
        assetId: accessoryAssetId,
      },
    });
    const range = `[${period.start.toISOString()},${period.end.toISOString()})`;
    await prisma.client.$executeRaw`
      INSERT INTO v2_asset_blocks (id, tenant_id, rental_id, asset_id, period, block_type)
      VALUES (${randomUUID()}, ${setup.tenant.id}, ${setup.rental.rentalId}, ${accessoryAssetId}, ${range}::tstzrange, 'ACCESSORY')
    `;

    expect((await cancel(setup.tenant.id, setup.rental.rentalId)).isOk()).toBe(true);

    expect(await prisma.client.v2RentalAccessorySelection.findUnique({ where: { id: selection.id } })).not.toBeNull();
    expect(
      await prisma.client.v2RentalAccessoryAssetAssignment.findUnique({ where: { id: assignment.id } }),
    ).not.toBeNull();
    const blocks = (await confirmedRentals.persistedState(setup.rental.rentalId)).blocks;
    expect(blocks.some((block) => block.blockType === 'ACCESSORY')).toBe(true);
    expect(blocks.every((block) => block.releasedAt !== null)).toBe(true);
  });

  it('makes released inventory reusable through the real confirmation path', async () => {
    const rentalA = await confirmed();
    const rentalB = await rentals.createRental({
      tenantId: rentalA.tenant.id,
      branchId: rentalA.branch.id,
      customerId: rentalA.customer.id,
      period,
      demands: [{ equipmentTypeId: rentalA.offer.equipmentType.id }],
    });

    const unavailable = await commandBus.execute<ConfirmRentalCommand, ConfirmRentalResult>(
      new ConfirmRentalCommand(rentalA.tenant.id, rentalB.rentalId),
    );
    expect(unavailable.isErr() && unavailable.error.code).toBe('rental_commitment.insufficient_asset_availability');
    expect((await cancel(rentalA.tenant.id, rentalA.rental.rentalId)).isOk()).toBe(true);
    expect(
      (
        await commandBus.execute<ConfirmRentalCommand, ConfirmRentalResult>(
          new ConfirmRentalCommand(rentalA.tenant.id, rentalB.rentalId),
        )
      ).isOk(),
    ).toBe(true);

    const stateB = await confirmedRentals.persistedState(rentalB.rentalId);
    expect(stateB.rental.status).toBe('CONFIRMED');
    expect(stateB.blocks.filter((block) => block.releasedAt === null)).toHaveLength(1);
    expect(stateB.blocks[0].assetId).toBe(rentalA.rental.assetIds[0]);
  });

  it.each([
    ['CANCELLED', 'rental_commitment.rental_already_cancelled'],
    ['COMPLETED', 'rental_commitment.rental_cannot_be_cancelled_from_status'],
  ] as const)('rejects %s without mutation', async (status, code) => {
    const setup = await unconfirmed(status);
    const before = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    const result = await cancel(setup.tenant.id, setup.rental.rentalId);
    expect(result.isErr() && result.error.code).toBe(code);
    expect(await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } })).toEqual(before);
  });

  it('publishes no cancellation event when guarded persistence fails', async () => {
    const setup = await confirmed();
    const before = await confirmedRentals.persistedState(setup.rental.rentalId);
    const repository = moduleRef.get(RentalRepository);
    const saveSpy = jest.spyOn(repository, 'save').mockRejectedValueOnce(new Error('forced persistence failure'));
    const published: RentalCancelledIntegrationEvent[] = [];
    const listener = (event: RentalCancelledIntegrationEvent) => published.push(event);
    events.on(RentalCancelledIntegrationEvent.name, listener);

    try {
      await expect(cancel(setup.tenant.id, setup.rental.rentalId)).rejects.toThrow('forced persistence failure');
      expect(published).toHaveLength(0);
      expect(await confirmedRentals.persistedState(setup.rental.rentalId)).toEqual(before);
    } finally {
      saveSpy.mockRestore();
      events.off(RentalCancelledIntegrationEvent.name, listener);
    }
  });

  it('does not disclose or mutate another tenant rental', async () => {
    const tenantA = await core.createTenant();
    const setupB = await confirmed();
    const before = await confirmedRentals.persistedState(setupB.rental.rentalId);
    const result = await cancel(tenantA.id, setupB.rental.rentalId);
    expect(result.isErr() && result.error.code).toBe('rental_commitment.rental_not_found');
    expect(await confirmedRentals.persistedState(setupB.rental.rentalId)).toEqual(before);
  });

  it('allows exactly one of two cancellations that evaluated the same version and publishes once', async () => {
    const setup = await confirmed();
    const repository = moduleRef.get(RentalRepository);
    const originalFindById = repository.findById.bind(repository);
    const loaded = createBarrier(2);
    const findSpy = jest.spyOn(repository, 'findById').mockImplementation(async (tenantId, rentalId, tx) => {
      const rental = await originalFindById(tenantId, rentalId, tx);
      if (rentalId === setup.rental.rentalId && !tx) await loaded.wait();
      return rental;
    });
    const published: RentalCancelledIntegrationEvent[] = [];
    const listener = (event: RentalCancelledIntegrationEvent) => published.push(event);
    events.on(RentalCancelledIntegrationEvent.name, listener);

    try {
      const outcomes = await runConcurrently([
        () => cancel(setup.tenant.id, setup.rental.rentalId),
        () => cancel(setup.tenant.id, setup.rental.rentalId),
      ]);
      const results = outcomes.map((outcome) => (outcome as PromiseFulfilledResult<CancelRentalResult>).value);
      expect(results.filter((result) => result.isOk())).toHaveLength(1);
      expect(
        results.filter((result) => result.isErr() && result.error.code === 'rental_commitment.rental_version_conflict'),
      ).toHaveLength(1);
      expect(published).toHaveLength(1);
    } finally {
      findSpy.mockRestore();
      events.off(RentalCancelledIntegrationEvent.name, listener);
    }

    const state = await confirmedRentals.persistedState(setup.rental.rentalId);
    expect(state.rental.status).toBe('CANCELLED');
    expect(state.blocks.every((block) => block.releasedAt !== null)).toBe(true);
    const repeated = await cancel(setup.tenant.id, setup.rental.rentalId);
    expect(repeated.isErr() && repeated.error.code).toBe('rental_commitment.rental_already_cancelled');
  });

  it('allows exactly one same-version cancellation or confirmation without mixed state', async () => {
    const setup = await unconfirmed();
    await rentals.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.rental.equipmentTypeIds[0],
    });
    const repository = moduleRef.get(RentalRepository);
    const originalFindById = repository.findById.bind(repository);
    const loaded = createBarrier(2);
    const findSpy = jest.spyOn(repository, 'findById').mockImplementation(async (tenantId, rentalId, tx) => {
      const rental = await originalFindById(tenantId, rentalId, tx);
      if (rentalId === setup.rental.rentalId && !tx) await loaded.wait();
      return rental;
    });

    try {
      const outcomes = await runConcurrently<CancelRentalResult | ConfirmRentalResult>([
        () => cancel(setup.tenant.id, setup.rental.rentalId),
        () => commandBus.execute(new ConfirmRentalCommand(setup.tenant.id, setup.rental.rentalId)),
      ]);
      const results = outcomes.map(
        (outcome) => (outcome as PromiseFulfilledResult<CancelRentalResult | ConfirmRentalResult>).value,
      );
      expect(results.filter((result) => result.isOk())).toHaveLength(1);
      expect(
        results.filter((result) => result.isErr() && result.error.code === 'rental_commitment.rental_version_conflict'),
      ).toHaveLength(1);
    } finally {
      findSpy.mockRestore();
    }

    const state = await confirmedRentals.persistedState(setup.rental.rentalId);
    const activeBlocks = state.blocks.filter((block) => block.releasedAt === null);
    expect(state.rental.version).toBe(1);
    if (state.rental.status === 'CANCELLED') {
      expect(state.rental.assignedAssets).toHaveLength(0);
      expect(activeBlocks).toHaveLength(0);
    } else {
      expect(state.rental.status).toBe('CONFIRMED');
      expect(state.rental.assignedAssets).toHaveLength(1);
      expect(activeBlocks).toHaveLength(1);
    }
  });

  it('increments version after a successful guarded lifecycle update', async () => {
    const setup = await unconfirmed();
    const before = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    expect((await cancel(setup.tenant.id, setup.rental.rentalId)).isOk()).toBe(true);
    const after = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    expect(after.version).toBe(before.version + 1);
  });
});
