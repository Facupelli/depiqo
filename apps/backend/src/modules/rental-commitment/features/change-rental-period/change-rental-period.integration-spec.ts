import { randomUUID } from 'node:crypto';
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
import { EditConfirmedRentalFixtures } from '../edit-confirmed-rental/testing/edit-confirmed-rental.fixtures';
import { ChangeRentalPeriodCommand } from './change-rental-period.command';
import { ChangeRentalPeriodResult } from './change-rental-period.handler';

describe('ChangeRentalPeriod integration', () => {
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

  async function scenario(period: { start: Date; end: Date }, quantity = 1) {
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
    const persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    return { tenant, branch, user, offer, rental, version: persisted.version };
  }

  function change(setup: Awaited<ReturnType<typeof scenario>>, start: Date, end: Date, version = setup.version) {
    return bus.execute<ChangeRentalPeriodCommand, ChangeRentalPeriodResult>(
      new ChangeRentalPeriodCommand({
        tenantId: setup.tenant.id,
        tenantUserId: setup.user.id,
        rentalId: setup.rental.rentalId,
        expectedVersion: version,
        start,
        end,
      }),
    );
  }

  it('moves a pre-start period while retaining assets, repricing, emitting, and resizing accessories', async () => {
    const now = Date.now();
    const setup = await scenario({ start: new Date(now + 3_600_000), end: new Date(now + 90_000_000) });
    const newStart = new Date(now + 7_200_000);
    const newEnd = new Date(now + 180_000_000);
    const accessoryAssetId = await fixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: randomUUID(),
    });
    const accessory = await prisma.client.v2RentalAccessorySelection.create({
      data: {
        tenantId: setup.tenant.id,
        rentalOrderId: setup.rental.rentalId,
        equipmentTypeId: randomUUID(),
        equipmentTypeNameSnapshot: 'Accessory',
        quantity: 1,
      },
    });
    await prisma.client.v2RentalAccessoryAssetAssignment.create({
      data: {
        tenantId: setup.tenant.id,
        rentalOrderId: setup.rental.rentalId,
        rentalAccessorySelectionId: accessory.id,
        assetId: accessoryAssetId,
      },
    });
    await prisma.client.$executeRaw`INSERT INTO v2_asset_blocks (id, tenant_id, rental_id, asset_id, period, block_type)
      VALUES (${randomUUID()}, ${setup.tenant.id}, ${setup.rental.rentalId}, ${accessoryAssetId},
      ${`[${new Date(now + 3_600_000).toISOString()},${new Date(now + 90_000_000).toISOString()})`}::tstzrange, 'ACCESSORY')`;
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    const result = await change(setup, newStart, newEnd);
    emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    expect(result.isOk()).toBe(true);
    const state = await fixtures.persistedState(setup.rental.rentalId);
    expect(state.rental.assignedAssets.map((item) => item.assetId)).toEqual(setup.rental.assetIds);
    expect(state.rental.assignedAssets.every((item) => item.effectiveFrom.getTime() === newStart.getTime())).toBe(true);
    expect(
      state.blocks
        .filter((block) => block.releasedAt === null)
        .every((block) => {
          const period = parsePostgresRange(block.period);
          return period.start.getTime() === newStart.getTime() && period.end.getTime() === newEnd.getTime();
        }),
    ).toBe(true);
    const accessoryPeriod = parsePostgresRange(state.blocks.find((block) => block.blockType === 'ACCESSORY')!.period);
    expect([accessoryPeriod.start.getTime(), accessoryPeriod.end.getTime()]).toEqual([
      newStart.getTime(),
      newEnd.getTime(),
    ]);
    expect(events).toHaveLength(1);
    expect((state.rental.priceSnapshot as { manualAdjustment?: unknown }).manualAdjustment).toBeUndefined();
  });

  it('extends a started rental using only the extension interval and preserves heterogeneous starts and history', async () => {
    const now = Date.now();
    const start = new Date(now - 7_200_000);
    const oldEnd = new Date(now + 3_600_000);
    const setup = await scenario({ start, end: oldEnd }, 2);
    const laterStart = new Date(now - 3_600_000);
    const laterAssignment = (await fixtures.persistedState(setup.rental.rentalId)).rental.assignedAssets[1];
    await prisma.client.v2AssignedAsset.update({
      where: { id: laterAssignment.id },
      data: { effectiveFrom: laterStart },
    });
    await prisma.client
      .$executeRaw`UPDATE v2_asset_blocks SET period = tstzrange(${laterStart}, ${oldEnd}, '[)') WHERE asset_id = ${laterAssignment.assetId} AND released_at IS NULL`;
    const historicalAssetId = await fixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.offer.equipmentType.id,
    });
    const historicalAssignment = await prisma.client.v2AssignedAsset.create({
      data: {
        tenantId: setup.tenant.id,
        rentalId: setup.rental.rentalId,
        rentalDemandLineId: laterAssignment.rentalDemandLineId,
        assetId: historicalAssetId,
        ownershipSnapshot: { kind: 'TENANT_OWNED' },
        effectiveFrom: start,
        effectiveUntil: laterStart,
      },
    });
    const historicalBlockId = randomUUID();
    await prisma.client.$executeRaw`INSERT INTO v2_asset_blocks
      (id, tenant_id, rental_id, asset_id, period, block_type, released_at)
      VALUES (${historicalBlockId}, ${setup.tenant.id}, ${setup.rental.rentalId}, ${historicalAssetId},
      ${`[${start.toISOString()},${laterStart.toISOString()})`}::tstzrange, 'EQUIPMENT', ${laterStart})`;
    const newEnd = new Date(now + 7_200_000);
    const result = await change(setup, start, newEnd);
    expect(result.isOk()).toBe(true);
    const state = await fixtures.persistedState(setup.rental.rentalId);
    expect(
      state.rental.assignedAssets
        .filter((item) => item.effectiveUntil === null)
        .map((item) => item.effectiveFrom.getTime())
        .sort(),
    ).toEqual([start.getTime(), laterStart.getTime()].sort());
    expect(
      state.blocks
        .filter((block) => block.releasedAt === null)
        .every((block) => parsePostgresRange(block.period).end.getTime() === newEnd.getTime()),
    ).toBe(true);
    expect(state.rental.assignedAssets.find((item) => item.id === historicalAssignment.id)?.effectiveUntil).toEqual(
      laterStart,
    );
    const persistedHistoricalBlock = state.blocks.find((block) => block.id === historicalBlockId)!;
    expect(parsePostgresRange(persistedHistoricalBlock.period).end).toEqual(laterStart);
    expect(persistedHistoricalBlock.releasedAt).toEqual(laterStart);
  });

  it('shortens a started rental without depending on availability', async () => {
    const now = Date.now();
    const start = new Date(now - 3_600_000);
    const setup = await scenario({ start, end: new Date(now + 7_200_000) });
    const newEnd = new Date(now + 3_600_000);
    expect((await change(setup, start, newEnd)).isOk()).toBe(true);
  });

  it('rejects conflict, started start change, ended mutation, and stale version', async () => {
    const now = Date.now();
    const future = await scenario({ start: new Date(now + 3_600_000), end: new Date(now + 7_200_000) });
    await fixtures.createConfirmedRental({
      tenantId: future.tenant.id,
      branchId: future.branch.id,
      customerId: (await core.createRentalCustomer({ tenantId: future.tenant.id })).customer.id,
      period: { start: new Date(now + 8_000_000), end: new Date(now + 12_000_000) },
      offerId: future.offer.offer.id,
      equipmentTypeId: future.offer.equipmentType.id,
      assetId: future.rental.assetIds[0],
    });
    expect((await change(future, new Date(now + 8_000_000), new Date(now + 12_000_000))).error.code).toBe(
      'rental_commitment.insufficient_asset_availability',
    );
    const started = await scenario({ start: new Date(now - 3_600_000), end: new Date(now + 3_600_000) });
    expect((await change(started, new Date(now - 7_200_000), new Date(now + 4_000_000))).error.code).toBe(
      'rental_commitment.invalid_rental_period',
    );
    const ended = await scenario({ start: new Date(now - 7_200_000), end: new Date(now - 3_600_000) });
    expect((await change(ended, new Date(now - 7_200_000), new Date(now + 7_200_000))).error.code).toBe(
      'rental_commitment.rental_period_ended',
    );
    expect(
      (await change(started, new Date(now - 3_600_000), new Date(now + 5_000_000), started.version + 1)).error.code,
    ).toBe('rental_commitment.rental_version_conflict');
  });

  it('returns an ended same-period request as a no-op without event or version bump', async () => {
    const now = Date.now();
    const period = { start: new Date(now - 7_200_000), end: new Date(now - 3_600_000) };
    const setup = await scenario(period);
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    const result = await change(setup, period.start, period.end);
    emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    expect(result.isOk() && result.value.version).toBe(setup.version);
    expect(events).toHaveLength(0);
  });
});
