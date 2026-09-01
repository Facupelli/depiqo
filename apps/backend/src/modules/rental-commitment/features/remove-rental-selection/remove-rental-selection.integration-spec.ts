import { CommandBus } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/core/database/prisma.service';
import { parsePostgresRange } from 'src/core/utils/postgres-range.util';
import {
  createRentalCommitmentIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { ConfirmedRentalEditedIntegrationEvent } from '../../public-api/events/rental-lifecycle.integration-events';
import { AddRentalSelectionCommand } from '../add-rental-selection/add-rental-selection.command';
import { ConfirmedRentalFixtures } from '../../testing/confirmed-rental.fixtures';
import { RemoveRentalSelectionCommand } from './remove-rental-selection.command';

describe('RemoveRentalSelection integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let bus: CommandBus;
  let emitter: EventEmitter2;
  let core: TestFixtures;
  let fixtures: ConfirmedRentalFixtures;

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    bus = moduleRef.get(CommandBus);
    emitter = moduleRef.get(EventEmitter2);
    core = createTestFixtures(prisma);
    fixtures = new ConfirmedRentalFixtures(prisma);
    return moduleRef;
  });

  it('tombstones one in-progress selection and closes only its physical participation', async () => {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const { user } = await core.createTenantUser({ tenantId: tenant.id });
    const first = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id, pricePerDay: '100.00' });
    const second = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id, pricePerDay: '50.00' });
    const now = Date.now();
    const rental = await fixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period: { start: new Date(now - 60_000), end: new Date(now + 3_600_000) },
      offerId: first.offer.id,
      equipmentTypeId: first.equipmentType.id,
      acceptedAssetBuffer: { beforeBufferMinutes: 10, afterBufferMinutes: 15 },
    });
    await fixtures.createCandidate({
      tenantId: tenant.id,
      branchId: branch.id,
      equipmentTypeId: second.equipmentType.id,
    });
    let persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    const added = await bus.execute(
      new AddRentalSelectionCommand({
        tenantId: tenant.id,
        tenantUserId: user.id,
        rentalId: rental.rentalId,
        expectedVersion: persisted.version,
        rentalOfferId: second.offer.id,
        quantity: 1,
      }),
    );
    expect(added.isOk()).toBe(true);
    const before = await fixtures.persistedState(rental.rentalId);
    const target = before.rental.selections.find((selection) => selection.rentalOfferId === second.offer.id)!;
    const targetDemand = before.rental.demandLines.find((line) => line.rentalSelectionId === target.id)!;
    const targetAssignment = before.rental.assignedAssets.find((item) => item.rentalDemandLineId === targetDemand.id)!;
    const unrelatedAssignment = before.rental.assignedAssets.find((item) => item.id !== targetAssignment.id)!;
    const sourceDemand = before.rental.demandLines.find((line) => line.id !== targetDemand.id)!;
    await fixtures.createAccessoryState({
      tenantId: tenant.id,
      branchId: branch.id,
      rentalId: rental.rentalId,
      sourceRentalDemandLineId: sourceDemand.id,
      period: { start: before.rental.periodStart, end: before.rental.periodEnd },
    });
    const accessoryBefore = await fixtures.accessoryState(rental.rentalId);
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    const result = await bus.execute(
      new RemoveRentalSelectionCommand({
        tenantId: tenant.id,
        tenantUserId: user.id,
        rentalId: rental.rentalId,
        selectionId: target.id,
        expectedVersion: persisted.version,
      }),
    );
    emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    expect(result.isOk()).toBe(true);
    const after = await fixtures.persistedState(rental.rentalId);
    const removedSelection = after.rental.selections.find((item) => item.id === target.id)!;
    const removedDemand = after.rental.demandLines.find((item) => item.id === targetDemand.id)!;
    const closedAssignment = after.rental.assignedAssets.find((item) => item.id === targetAssignment.id)!;
    expect(removedSelection).toMatchObject({ id: target.id, createdAt: target.createdAt });
    expect(removedDemand).toMatchObject({ id: targetDemand.id, createdAt: targetDemand.createdAt });
    expect(removedSelection.removedAt).toEqual(removedDemand.removedAt);
    expect(closedAssignment.effectiveUntil).toEqual(removedSelection.removedAt);
    expect(after.rental.assignedAssets.find((item) => item.id === unrelatedAssignment.id)).toEqual(unrelatedAssignment);
    const releasedBlock = after.blocks.find((block) => block.assetId === targetAssignment.assetId)!;
    expect(releasedBlock.releasedAt).toBeNull();
    expect(parsePostgresRange(releasedBlock.period).end).toEqual(
      new Date(removedSelection.removedAt!.getTime() + 15 * 60_000),
    );
    const price = after.rental.priceSnapshot as {
      final: { lines: Array<{ rentalSelectionId: string }> };
      manualAdjustment?: unknown;
    };
    expect(price.final.lines.map((line) => line.rentalSelectionId)).not.toContain(target.id);
    expect(price.manualAdjustment).toBeUndefined();
    expect(after.rental.ownerSplits.every((split) => split.rentalSelectionId !== target.id)).toBe(true);
    expect(await fixtures.accessoryState(rental.rentalId)).toEqual(accessoryBefore);
    expect(events).toHaveLength(1);
  });

  it('rejects removing a selection whose demand is referenced by an accessory', async () => {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const { user } = await core.createTenantUser({ tenantId: tenant.id });
    const first = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id });
    const second = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id });
    const period = { start: new Date(Date.now() + 3_600_000), end: new Date(Date.now() + 7_200_000) };
    const rental = await fixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period,
      offerId: first.offer.id,
      equipmentTypeId: first.equipmentType.id,
    });
    await fixtures.createCandidate({
      tenantId: tenant.id,
      branchId: branch.id,
      equipmentTypeId: second.equipmentType.id,
    });
    let persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    expect(
      (
        await bus.execute(
          new AddRentalSelectionCommand({
            tenantId: tenant.id,
            tenantUserId: user.id,
            rentalId: rental.rentalId,
            expectedVersion: persisted.version,
            rentalOfferId: second.offer.id,
            quantity: 1,
          }),
        )
      ).isOk(),
    ).toBe(true);
    const state = await fixtures.persistedState(rental.rentalId);
    const referencedSelection = state.rental.selections.find(
      (selection) => selection.rentalOfferId === first.offer.id,
    )!;
    const sourceDemand = state.rental.demandLines.find((line) => line.rentalSelectionId === referencedSelection.id)!;
    await fixtures.createAccessoryState({
      tenantId: tenant.id,
      branchId: branch.id,
      rentalId: rental.rentalId,
      sourceRentalDemandLineId: sourceDemand.id,
      period,
    });

    persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    const result = await bus.execute(
      new RemoveRentalSelectionCommand({
        tenantId: tenant.id,
        tenantUserId: user.id,
        rentalId: rental.rentalId,
        selectionId: referencedSelection.id,
        expectedVersion: persisted.version,
      }),
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('rental_commitment.rental_selection_referenced_by_accessory');
    }
    expect((await fixtures.persistedState(rental.rentalId)).rental.version).toBe(persisted.version);
  });

  it('drops a pre-start plan and re-adds the same offer with new commercial IDs', async () => {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const { user } = await core.createTenantUser({ tenantId: tenant.id });
    const first = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id, pricePerDay: '100.00' });
    const targetOffer = await fixtures.createOffer({
      tenantId: tenant.id,
      branchId: branch.id,
      pricePerDay: '50.00',
    });
    const now = Date.now();
    const rental = await fixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period: { start: new Date(now + 3_600_000), end: new Date(now + 7_200_000) },
      offerId: first.offer.id,
      equipmentTypeId: first.equipmentType.id,
    });
    await fixtures.createCandidate({
      tenantId: tenant.id,
      branchId: branch.id,
      equipmentTypeId: targetOffer.equipmentType.id,
    });

    let persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    expect(
      (
        await bus.execute(
          new AddRentalSelectionCommand({
            tenantId: tenant.id,
            tenantUserId: user.id,
            rentalId: rental.rentalId,
            expectedVersion: persisted.version,
            rentalOfferId: targetOffer.offer.id,
            quantity: 1,
          }),
        )
      ).isOk(),
    ).toBe(true);

    const beforeRemoval = await fixtures.persistedState(rental.rentalId);
    const oldSelection = beforeRemoval.rental.selections.find(
      (selection) => selection.rentalOfferId === targetOffer.offer.id,
    )!;
    const oldDemand = beforeRemoval.rental.demandLines.find((line) => line.rentalSelectionId === oldSelection.id)!;
    const oldAssignment = beforeRemoval.rental.assignedAssets.find(
      (assignment) => assignment.rentalDemandLineId === oldDemand.id,
    )!;
    expect(beforeRemoval.blocks.some((block) => block.assetId === oldAssignment.assetId)).toBe(true);

    persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    expect(
      (
        await bus.execute(
          new RemoveRentalSelectionCommand({
            tenantId: tenant.id,
            tenantUserId: user.id,
            rentalId: rental.rentalId,
            selectionId: oldSelection.id,
            expectedVersion: persisted.version,
          }),
        )
      ).isOk(),
    ).toBe(true);

    const afterRemoval = await fixtures.persistedState(rental.rentalId);
    const tombstonedSelection = afterRemoval.rental.selections.find((item) => item.id === oldSelection.id)!;
    const tombstonedDemand = afterRemoval.rental.demandLines.find((item) => item.id === oldDemand.id)!;
    expect(tombstonedSelection.removedAt).toEqual(expect.any(Date));
    expect(tombstonedDemand.removedAt).toEqual(tombstonedSelection.removedAt);
    expect(afterRemoval.rental.assignedAssets.some((assignment) => assignment.id === oldAssignment.id)).toBe(false);
    expect(afterRemoval.blocks.some((block) => block.assetId === oldAssignment.assetId)).toBe(false);

    persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    expect(
      (
        await bus.execute(
          new AddRentalSelectionCommand({
            tenantId: tenant.id,
            tenantUserId: user.id,
            rentalId: rental.rentalId,
            expectedVersion: persisted.version,
            rentalOfferId: targetOffer.offer.id,
            quantity: 1,
          }),
        )
      ).isOk(),
    ).toBe(true);

    const afterReAdd = await fixtures.persistedState(rental.rentalId);
    const readdedSelection = afterReAdd.rental.selections.find(
      (selection) => selection.rentalOfferId === targetOffer.offer.id && selection.removedAt === null,
    )!;
    const readdedDemand = afterReAdd.rental.demandLines.find(
      (line) => line.rentalSelectionId === readdedSelection.id && line.removedAt === null,
    )!;
    expect(readdedSelection.id).not.toBe(oldSelection.id);
    expect(readdedDemand.id).not.toBe(oldDemand.id);
    expect(afterReAdd.rental.selections.find((item) => item.id === oldSelection.id)?.removedAt).toEqual(
      tombstonedSelection.removedAt,
    );
    expect(afterReAdd.rental.demandLines.find((item) => item.id === oldDemand.id)?.removedAt).toEqual(
      tombstonedDemand.removedAt,
    );
  });
});
