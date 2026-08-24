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
import { EditConfirmedRentalFixtures } from '../edit-confirmed-rental/testing/edit-confirmed-rental.fixtures';
import { RemoveRentalSelectionCommand } from './remove-rental-selection.command';

describe('RemoveRentalSelection integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let bus: CommandBus;
  let emitter: EventEmitter2;
  let core: TestFixtures;
  let fixtures: EditConfirmedRentalFixtures;

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    bus = moduleRef.get(CommandBus);
    emitter = moduleRef.get(EventEmitter2);
    core = createTestFixtures(prisma);
    fixtures = new EditConfirmedRentalFixtures(prisma);
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
    expect(removedSelection.removedAt).toEqual(removedDemand.removedAt);
    expect(closedAssignment.effectiveUntil).toEqual(removedSelection.removedAt);
    expect(after.rental.assignedAssets.find((item) => item.id === unrelatedAssignment.id)).toEqual(unrelatedAssignment);
    const releasedBlock = after.blocks.find((block) => block.assetId === targetAssignment.assetId)!;
    expect(releasedBlock.releasedAt).toEqual(removedSelection.removedAt);
    expect(parsePostgresRange(releasedBlock.period).end).toEqual(removedSelection.removedAt);
    const price = after.rental.priceSnapshot as {
      final: { lines: Array<{ rentalSelectionId: string }> };
      manualAdjustment?: unknown;
    };
    expect(price.final.lines.map((line) => line.rentalSelectionId)).not.toContain(target.id);
    expect(price.manualAdjustment).toBeUndefined();
    expect(after.rental.ownerSplits.every((split) => split.rentalSelectionId !== target.id)).toBe(true);
    expect(events).toHaveLength(1);
  });
});
