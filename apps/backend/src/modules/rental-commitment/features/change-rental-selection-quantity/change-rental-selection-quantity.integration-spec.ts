import { CommandBus } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/core/database/prisma.service';
import { parsePostgresRange } from 'src/core/utils/postgres-range.util';
import { ConfirmedRentalEditedIntegrationEvent } from '../../public-api/events/rental-lifecycle.integration-events';
import {
  createRentalCommitmentIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { ConfirmedRentalFixtures } from '../../testing/confirmed-rental.fixtures';
import { ChangeRentalSelectionQuantityCommand } from './change-rental-selection-quantity.command';

describe('ChangeRentalSelectionQuantity integration', () => {
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

  async function scenario(quantity: number, period: { start: Date; end: Date }) {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const { user } = await core.createTenantUser({ tenantId: tenant.id });
    const offer = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id, pricePerDay: '100.00' });
    const rental = await fixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period,
      offerId: offer.offer.id,
      equipmentTypeId: offer.equipmentType.id,
      quantity,
    });
    return { tenant, branch, user, offer, rental };
  }
  async function execute(
    setup: Awaited<ReturnType<typeof scenario>>,
    quantity: number,
    releaseAssetIds: string[] = [],
  ) {
    const persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    return bus.execute(
      new ChangeRentalSelectionQuantityCommand({
        tenantId: setup.tenant.id,
        tenantUserId: setup.user.id,
        rentalId: setup.rental.rentalId,
        selectionId: setup.rental.selectionIds[0],
        expectedVersion: persisted.version,
        quantity,
        releaseAssetIds,
      }),
    );
  }

  it('increases during rental by allocating only the delta and preserving existing facts', async () => {
    const now = Date.now();
    const setup = await scenario(1, { start: new Date(now - 60_000), end: new Date(now + 3_600_000) });
    await fixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.offer.equipmentType.id,
    });
    await fixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.offer.equipmentType.id,
    });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    expect((await execute(setup, 3)).isOk()).toBe(true);
    emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    const after = await fixtures.persistedState(setup.rental.rentalId);
    expect(after.rental.assignedAssets.find(({ id }) => id === before.rental.assignedAssets[0].id)).toEqual(
      before.rental.assignedAssets[0],
    );
    expect(after.rental.selections[0].quantity).toBe(3);
    expect(after.rental.demandLines[0].quantity).toBe(3);
    const additions = after.rental.assignedAssets.filter(
      (item) => !before.rental.assignedAssets.some(({ id }) => id === item.id),
    );
    expect(additions).toHaveLength(2);
    for (const assignment of additions) {
      const block = after.blocks.find((candidate) => candidate.assetId === assignment.assetId)!;
      expect(parsePostgresRange(block.period).start).toEqual(assignment.effectiveFrom);
    }
    expect(
      (after.rental.priceSnapshot as { final: { lines: Array<{ quantity: number }> } }).final.lines[0].quantity,
    ).toBe(3);
    expect(events).toHaveLength(1);
    expect(events[0].occurredAt).toEqual(additions[0].effectiveFrom);
  });

  it('decreases during rental by closing exactly the selected assignment and block', async () => {
    const now = Date.now();
    const setup = await scenario(3, { start: new Date(now - 60_000), end: new Date(now + 3_600_000) });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const releasedId = setup.rental.assetIds[1];
    expect((await execute(setup, 2, [releasedId])).isOk()).toBe(true);
    const after = await fixtures.persistedState(setup.rental.rentalId);
    const assignment = after.rental.assignedAssets.find((item) => item.assetId === releasedId)!;
    const block = after.blocks.find((item) => item.assetId === releasedId)!;
    const range = parsePostgresRange(block.period);
    expect(assignment.id).toBe(before.rental.assignedAssets.find((item) => item.assetId === releasedId)!.id);
    expect(assignment.effectiveUntil).toEqual(range.end);
    expect(block.releasedAt).toEqual(range.end);
    expect(after.rental.assignedAssets.filter((item) => item.effectiveUntil === null)).toHaveLength(2);
    expect(after.rental.selections[0].quantity).toBe(2);
    expect(after.rental.demandLines[0].quantity).toBe(2);
  });

  it('removes a released future plan and permits an ended same-quantity no-op', async () => {
    const now = Date.now();
    const future = await scenario(2, { start: new Date(now + 3_600_000), end: new Date(now + 7_200_000) });
    const releasedId = future.rental.assetIds[0];
    expect((await execute(future, 1, [releasedId])).isOk()).toBe(true);
    const changed = await fixtures.persistedState(future.rental.rentalId);
    expect(changed.rental.assignedAssets.some((item) => item.assetId === releasedId)).toBe(false);
    expect(changed.blocks.some((item) => item.assetId === releasedId)).toBe(false);
    const ended = await scenario(1, { start: new Date(now - 7_200_000), end: new Date(now - 3_600_000) });
    const before = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: ended.rental.rentalId } });
    const result = await execute(ended, 1);
    const after = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: ended.rental.rentalId } });
    expect(result.isOk()).toBe(true);
    expect(after.version).toBe(before.version);
    expect(after.updatedAt).toEqual(before.updatedAt);
  });
});
