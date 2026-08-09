import { CommandBus } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from 'src/core/database/prisma.service';
import { ConfirmedRentalEditedIntegrationEvent } from 'src/modules/rental-commitment/public-api/events/rental-lifecycle.integration-events';
import { createE2ETestApp, E2ETestApp } from '../../../../../test/support/create-e2e-test-app';
import { runConcurrently } from '../../../../../test/support/concurrency';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { oneMillisecondAfter, utcDate } from '../../../../../test/support/time';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { ConfirmRentalCommand } from '../confirm-rental/confirm-rental.command';
import { ConfirmRentalResult } from '../confirm-rental/confirm-rental.handler';
import { EditConfirmedRentalCommand } from './edit-confirmed-rental.command';
import { EditConfirmedRentalResult } from './edit-confirmed-rental.handler';
import { EditConfirmedRentalFixtures } from './testing/edit-confirmed-rental.fixtures';

describe('EditConfirmedRental integration', () => {
  let testApp: E2ETestApp;
  let prisma: PrismaService;
  let commandBus: CommandBus;
  let core: TestFixtures;
  let fixtures: EditConfirmedRentalFixtures;

  beforeAll(async () => {
    testApp = await createE2ETestApp();
    prisma = testApp.app.get(PrismaService);
    commandBus = testApp.app.get(CommandBus);
    core = createTestFixtures(prisma);
    fixtures = new EditConfirmedRentalFixtures(prisma);
  });

  afterAll(async () => testApp?.close());

  async function scenario(period = between(10, 12)) {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const { user } = await core.createTenantUser({ tenantId: tenant.id });
    const commercial = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id });
    const rental = await fixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period,
      offerId: commercial.offer.id,
      equipmentTypeId: commercial.equipmentType.id,
    });
    return { tenant, branch, customer, user, commercial, rental };
  }

  async function edit(
    setup: Awaited<ReturnType<typeof scenario>>,
    overrides: Partial<EditConfirmedRentalCommand['props']> = {},
  ): Promise<EditConfirmedRentalResult> {
    const current = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    return commandBus.execute(
      new EditConfirmedRentalCommand({
        tenantId: setup.tenant.id,
        tenantUserId: setup.user.id,
        rentalId: setup.rental.rentalId,
        expectedUpdatedAt: current.updatedAt,
        branchId: setup.branch.id,
        period: new RentalPeriod(current.periodStart, current.periodEnd),
        selectedOffers: [{ rentalOfferId: setup.commercial.offer.id, quantity: 1 }],
        fulfillmentMethod: 'PICKUP',
        notes: current.notes ?? undefined,
        insuranceSelected: current.insuranceSelected ?? undefined,
        manualPricingAdjustment: null,
        ...overrides,
      }),
    );
  }

  it('moves a confirmed rental to a free period and retains a valid assignment with matching blocks', async () => {
    const setup = await scenario();
    const result = await edit(setup, { period: new RentalPeriod(utcDate(2030, 1, 1, 13), utcDate(2030, 1, 1, 15)) });
    expect(result.isOk()).toBe(true);

    const state = await fixtures.persistedState(setup.rental.rentalId);
    expect(state.rental.status).toBe('CONFIRMED');
    expect(state.rental.periodStart).toEqual(utcDate(2030, 1, 1, 13));
    expect(state.rental.periodEnd).toEqual(utcDate(2030, 1, 1, 15));
    expect(state.rental.assignedAssets).toHaveLength(1);
    expect(state.rental.assignedAssets[0].assetId).toBe(setup.rental.assetIds[0]);
    expect(state.rental.demandLines).toHaveLength(1);
    expect(state.rental.demandLines[0].quantity).toBe(1);
    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0]).toEqual(expect.objectContaining({ assetId: setup.rental.assetIds[0], releasedAt: null }));
    expect(state.blocks[0].period).toContain('2030-01-01 13:00:00+00');
    expect(state.blocks[0].period).toContain('2030-01-01 15:00:00+00');
  });

  it('leaves the complete confirmed state unchanged when the target period is unavailable', async () => {
    const setup = await scenario();
    const blocker = await fixtures.createConfirmedRental({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      customerId: setup.customer.id,
      period: between(13, 15),
      offerId: setup.commercial.offer.id,
      equipmentTypeId: setup.commercial.equipmentType.id,
      assetId: setup.rental.assetIds[0],
    });
    expect(blocker.rentalId).not.toBe(setup.rental.rentalId);
    const before = await fixtures.persistedState(setup.rental.rentalId);

    const result = await edit(setup, { period: new RentalPeriod(utcDate(2030, 1, 1, 13), utcDate(2030, 1, 1, 15)) });
    expect(result.isErr() && result.error.code).toBe('rental_commitment.insufficient_asset_availability');
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it.each([
    ['left adjacency', between(8, 10), true],
    ['right adjacency', between(12, 14), true],
    ['representative overlap', between(11, 13), false],
    [
      'one millisecond overlap',
      { start: utcDate(2030, 1, 1, 8), end: oneMillisecondAfter(utcDate(2030, 1, 1, 10)) },
      false,
    ],
  ])('enforces half-open edit allocation for %s', async (_name, target, succeeds) => {
    const setup = await scenario(between(6, 8));
    const competing = await fixtures.createConfirmedRental({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      customerId: setup.customer.id,
      period: between(10, 12),
      offerId: setup.commercial.offer.id,
      equipmentTypeId: setup.commercial.equipmentType.id,
      assetId: setup.rental.assetIds[0],
    });
    expect(competing.rentalId).not.toBe(setup.rental.rentalId);
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const result = await edit(setup, { period: new RentalPeriod(target.start, target.end) });
    expect(result.isOk()).toBe(succeeds);
    const after = await fixtures.persistedState(setup.rental.rentalId);
    if (!succeeds) expect(after).toEqual(before);
    else {
      expect(after.blocks).toHaveLength(1);
      expect(after.blocks[0].period).toContain(target.start.toISOString().replace('T', ' ').replace('.000Z', '+00'));
      expect(after.blocks[0].period).toContain(target.end.toISOString().replace('T', ' ').replace('.000Z', '+00'));
    }
  });

  it('increases authoritative demand and allocates distinct assets', async () => {
    const setup = await scenario();
    const secondAsset = await fixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.commercial.equipmentType.id,
    });
    const result = await edit(setup, { selectedOffers: [{ rentalOfferId: setup.commercial.offer.id, quantity: 2 }] });
    expect(result.isOk()).toBe(true);
    const state = await fixtures.persistedState(setup.rental.rentalId);
    expect(state.rental.selections[0].quantity).toBe(2);
    expect(state.rental.demandLines[0].quantity).toBe(2);
    expect(new Set(state.rental.assignedAssets.map((value) => value.assetId))).toEqual(
      new Set([setup.rental.assetIds[0], secondAsset]),
    );
    expect(new Set(state.blocks.map((value) => value.assetId))).toEqual(
      new Set([setup.rental.assetIds[0], secondAsset]),
    );
  });

  it('preserves the complete old state when increased demand cannot be fulfilled', async () => {
    const setup = await scenario();
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const result = await edit(setup, { selectedOffers: [{ rentalOfferId: setup.commercial.offer.id, quantity: 2 }] });
    expect(result.isErr() && result.error.code).toBe('rental_commitment.insufficient_asset_availability');
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it('preserves snapshot and fulfillment state for an ordinary details-only edit', async () => {
    const setup = await scenario();
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const result = await edit(setup, { notes: 'Updated handling note', insuranceSelected: true });
    expect(result.isOk()).toBe(true);
    const after = await fixtures.persistedState(setup.rental.rentalId);
    expect(after.rental.notes).toBe('Updated handling note');
    expect(after.rental.insuranceSelected).toBe(true);
    expect(after.rental.priceSnapshot).toEqual(before.rental.priceSnapshot);
    expect(after.rental.selections).toEqual(before.rental.selections);
    expect(after.rental.demandLines).toEqual(before.rental.demandLines);
    expect(after.rental.assignedAssets).toEqual(before.rental.assignedAssets);
    expect(after.blocks).toEqual(before.blocks);
    expect(after.rental.ownerSplits).toEqual(before.rental.ownerSplits);
  });

  it('reprices an operational edit and accepts a non-null manual adjustment', async () => {
    const setup = await scenario();
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const result = await edit(setup, {
      period: new RentalPeriod(utcDate(2030, 1, 2, 10), utcDate(2030, 1, 4, 10)),
      manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal: '175.00', reason: 'Approved correction' },
    });
    expect(result.isOk()).toBe(true);
    const after = await fixtures.persistedState(setup.rental.rentalId);
    expect(after.rental.priceSnapshot).not.toEqual(before.rental.priceSnapshot);
    expect(after.rental.priceSnapshot).toEqual(
      expect.objectContaining({ manualPricingAdjustment: expect.any(Object) }),
    );
  });

  it('accepts an exact repeat as a no-op without duplicate state or an edit event', async () => {
    const setup = await scenario();
    const emitter = testApp.app.get(EventEmitter2);
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      const result = await edit(setup);
      expect(result.isOk()).toBe(true);
      const state = await fixtures.persistedState(setup.rental.rentalId);
      expect(state.rental.assignedAssets).toHaveLength(1);
      expect(state.blocks).toHaveLength(1);
      expect(events).toHaveLength(0);
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }
  });

  it('emits one edit event only after a changed edit persists', async () => {
    const setup = await scenario();
    const emitter = testApp.app.get(EventEmitter2);
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      expect((await edit(setup, { notes: 'Changed' })).isOk()).toBe(true);
      expect(events).toEqual([expect.objectContaining({ tenantId: setup.tenant.id, rentalId: setup.rental.rentalId })]);
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }
  });

  it('allows exactly one of two edits based on the same updatedAt and persists one complete state', async () => {
    const setup = await scenario();
    const current = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    const makeCommand = (startHour: number, endHour: number) =>
      new EditConfirmedRentalCommand({
        tenantId: setup.tenant.id,
        tenantUserId: setup.user.id,
        rentalId: setup.rental.rentalId,
        expectedUpdatedAt: current.updatedAt,
        branchId: setup.branch.id,
        period: new RentalPeriod(utcDate(2030, 1, 1, startHour), utcDate(2030, 1, 1, endHour)),
        selectedOffers: [{ rentalOfferId: setup.commercial.offer.id, quantity: 1 }],
        fulfillmentMethod: 'PICKUP',
        manualPricingAdjustment: null,
      });
    const outcomes = await runConcurrently([
      () => commandBus.execute<EditConfirmedRentalCommand, EditConfirmedRentalResult>(makeCommand(13, 15)),
      () => commandBus.execute<EditConfirmedRentalCommand, EditConfirmedRentalResult>(makeCommand(16, 18)),
    ]);
    expect(outcomes.every((outcome) => outcome.status === 'fulfilled')).toBe(true);
    const results = outcomes.map((outcome) => (outcome as PromiseFulfilledResult<EditConfirmedRentalResult>).value);
    expect(results.filter((result) => result.isOk())).toHaveLength(1);
    expect(
      results.filter((result) => result.isErr() && result.error.code === 'rental_commitment.rental_version_conflict'),
    ).toHaveLength(1);
    const state = await fixtures.persistedState(setup.rental.rentalId);
    expect([
      [13, 15],
      [16, 18],
    ]).toContainEqual([state.rental.periodStart.getUTCHours(), state.rental.periodEnd.getUTCHours()]);
    expect(state.rental.assignedAssets).toHaveLength(1);
    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0].period).toContain(
      `2030-01-01 ${String(state.rental.periodStart.getUTCHours()).padStart(2, '0')}:00:00+00`,
    );
  });

  it('keeps edit-versus-confirmation outcomes coherent without overlapping active blocks', async () => {
    const setup = await scenario();
    const draft = await fixtures.createConfirmedRental({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      customerId: setup.customer.id,
      period: between(13, 15),
      offerId: setup.commercial.offer.id,
      equipmentTypeId: setup.commercial.equipmentType.id,
    });
    await prisma.client.v2AssetBlock.deleteMany({ where: { rentalId: draft.rentalId } });
    await prisma.client.v2AssignedAsset.deleteMany({ where: { rentalId: draft.rentalId } });
    await prisma.client.v2Rental.update({ where: { id: draft.rentalId }, data: { status: 'DRAFT' } });
    await prisma.client.v2RentalAssetCandidate.deleteMany({ where: { assetId: draft.assetIds[0] } });

    const originalA = await fixtures.persistedState(setup.rental.rentalId);
    const outcomes = await runConcurrently([
      () => edit(setup, { period: new RentalPeriod(utcDate(2030, 1, 1, 13), utcDate(2030, 1, 1, 15)) }),
      () =>
        commandBus.execute<ConfirmRentalCommand, ConfirmRentalResult>(
          new ConfirmRentalCommand(setup.tenant.id, draft.rentalId),
        ),
    ]);
    expect(outcomes.every((outcome) => outcome.status === 'fulfilled')).toBe(true);

    const a = await fixtures.persistedState(setup.rental.rentalId);
    const b = await fixtures.persistedState(draft.rentalId);
    const aIsOriginal = a.rental.periodStart.getTime() === originalA.rental.periodStart.getTime();
    expect(aIsOriginal || a.rental.periodStart.getTime() === utcDate(2030, 1, 1, 13).getTime()).toBe(true);
    expect(['DRAFT', 'CONFIRMED']).toContain(b.rental.status);
    if (aIsOriginal) expect(a).toEqual(originalA);
    if (b.rental.status === 'DRAFT') {
      expect(b.rental.assignedAssets).toHaveLength(0);
      expect(b.blocks).toHaveLength(0);
    }
    const activeBlocks = [...a.blocks, ...b.blocks].filter((block) => block.releasedAt === null);
    for (const [index, left] of activeBlocks.entries()) {
      for (const right of activeBlocks.slice(index + 1)) {
        if (left.assetId === right.assetId) expect(rangesOverlap(left.period, right.period)).toBe(false);
      }
    }
  });
});

function between(startHour: number, endHour: number) {
  return { start: utcDate(2030, 1, 1, startHour), end: utcDate(2030, 1, 1, endHour) };
}

function rangesOverlap(left: string, right: string): boolean {
  const parse = (range: string) =>
    range
      .slice(1, -1)
      .split(',')
      .map((value) => new Date(value.replaceAll('"', '')).getTime());
  const [leftStart, leftEnd] = parse(left);
  const [rightStart, rightEnd] = parse(right);
  return leftStart < rightEnd && rightStart < leftEnd;
}
