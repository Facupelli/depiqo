import { randomUUID } from 'node:crypto';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { RentalConfirmedIntegrationEvent } from 'src/modules/rental-commitment/public-api/events/rental-lifecycle.integration-events';
import {
  createRentalCommitmentIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { runConcurrently } from '../../../../../test/support/concurrency';
import { oneMillisecondAfter, utcDate } from '../../../../../test/support/time';

import { ConfirmRentalFixtures } from '../confirm-rental/testing/confirm-rental.fixtures';
import { ConfirmRentalCommand } from '../confirm-rental/confirm-rental.command';
import { ConfirmRentalResult } from '../confirm-rental/confirm-rental.handler';
import { CreateConfirmedRentalCommand } from './create-confirmed-rental.command';
import { CreateConfirmedRentalServiceResult } from './create-confirmed-rental.handler';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';

interface OfferRequirement {
  equipmentTypeId?: string;
  quantityPerItem?: number;
}

interface Scenario {
  tenantId: string;
  branchId: string;
  customerId: string;
}

const period = (start = utcDate(2030, 1, 7, 10), end = utcDate(2030, 1, 7, 12)) => new RentalPeriod(start, end);

describe('CreateConfirmedRental integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let commandBus: CommandBus;
  let emitter: EventEmitter2;
  let core: TestFixtures;
  let confirmationFixtures: ConfirmRentalFixtures;

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    commandBus = moduleRef.get(CommandBus);
    emitter = moduleRef.get(EventEmitter2);
    core = createTestFixtures(prisma);
    confirmationFixtures = new ConfirmRentalFixtures(prisma);
    return moduleRef;
  });

  async function scenario(overrides: { supportsDelivery?: boolean } = {}): Promise<Scenario> {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({
      tenantId: tenant.id,
      overrides: { supportsDelivery: overrides.supportsDelivery ?? false },
    });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    await prisma.client.v2BranchSchedule.createMany({
      data: [
        { branchId: branch.id, type: 'PICKUP', dayOfWeek: 1, openTime: 0, closeTime: 1439 },
        { branchId: branch.id, type: 'RETURN', dayOfWeek: 1, openTime: 0, closeTime: 1439 },
      ],
    });
    return { tenantId: tenant.id, branchId: branch.id, customerId: customer.id };
  }

  async function offer(
    input: Scenario & { requirements?: OfferRequirement[]; pricePerDay?: string; rentable?: boolean },
  ) {
    const requirements = input.requirements ?? [{}];
    const equipmentTypes = await Promise.all(
      requirements.map(async (requirement) => {
        if (requirement.equipmentTypeId) {
          return prisma.client.v2EquipmentType.findUniqueOrThrow({ where: { id: requirement.equipmentTypeId } });
        }
        return prisma.client.v2EquipmentType.create({
          data: { tenantId: input.tenantId, name: `Equipment ${randomUUID()}` },
        });
      }),
    );
    const item = await prisma.client.v2RentableItem.create({
      data: {
        tenantId: input.tenantId,
        name: `Item ${randomUUID()}`,
        kind: 'SINGLE',
        status: 'ACTIVE',
        requirements: {
          create: requirements.map((requirement, index) => ({
            tenantId: input.tenantId,
            equipmentTypeId: equipmentTypes[index].id,
            quantityPerItem: requirement.quantityPerItem ?? 1,
          })),
        },
      },
    });
    const rentalOffer = await prisma.client.v2RentalOffer.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        rentableItemId: item.id,
        isVisible: true,
        isRentable: input.rentable ?? true,
      },
    });
    const ratePlan = await prisma.client.v2RatePlan.create({
      data: {
        tenantId: input.tenantId,
        name: `Daily ${randomUUID()}`,
        billingUnit: 'DAY',
        currency: 'USD',
        tiers: { create: { tenantId: input.tenantId, fromUnit: 1, pricePerUnit: input.pricePerDay ?? '100.00' } },
      },
    });
    await prisma.client.v2RentalOfferPricing.create({
      data: { tenantId: input.tenantId, catalogRentalOfferId: rentalOffer.id, ratePlanId: ratePlan.id },
    });
    return { offer: rentalOffer, item, equipmentTypes };
  }

  async function candidate(
    input: Scenario & {
      equipmentTypeId: string;
      assetId?: string;
      overrides?: Parameters<ConfirmRentalFixtures['createCandidate']>[0]['overrides'];
    },
  ) {
    return confirmationFixtures.createCandidate({
      tenantId: input.tenantId,
      branchId: input.branchId,
      equipmentTypeId: input.equipmentTypeId,
      assetId: input.assetId,
      overrides: input.overrides,
    });
  }

  function create(
    input: Scenario & {
      selectedOffers: Array<{ rentalOfferId: string; quantity: number }>;
      rentalPeriod?: RentalPeriod;
      fulfillmentMethod?: 'PICKUP' | 'DELIVERY';
      deliveryDetails?: { addressLine1: string; city: string };
    },
  ): Promise<CreateConfirmedRentalServiceResult> {
    return commandBus.execute(
      new CreateConfirmedRentalCommand({
        tenantId: input.tenantId,
        branchId: input.branchId,
        rentalCustomerId: input.customerId,
        period: input.rentalPeriod ?? period(),
        selectedOffers: input.selectedOffers,
        fulfillmentMethod: input.fulfillmentMethod,
        deliveryDetails: input.deliveryDetails,
      }),
    );
  }

  async function persisted(rentalId: string) {
    const rental = await prisma.client.v2Rental.findUniqueOrThrow({
      where: { id: rentalId },
      include: { selections: true, demandLines: true, assignedAssets: true, ownerSplits: true, deliveryDetails: true },
    });
    const blocks = await prisma.client.$queryRaw<
      Array<{ rentalId: string; assetId: string; period: string; blockType: string; releasedAt: Date | null }>
    >(Prisma.sql`
      SELECT rental_id AS "rentalId", asset_id AS "assetId", period::text AS period,
             block_type::text AS "blockType", released_at AS "releasedAt"
      FROM v2_asset_blocks WHERE rental_id = ${rentalId}
    `);
    return { rental, blocks };
  }

  async function commitmentCounts(input: Scenario) {
    const rentals = await prisma.client.v2Rental.findMany({
      where: { tenantId: input.tenantId, branchId: input.branchId, customerId: input.customerId },
      select: { id: true },
    });
    const ids = rentals.map((rental) => rental.id);
    const [selections, demand, assignments, splits, blocks] = await Promise.all([
      prisma.client.v2RentalSelection.count({ where: { rentalId: { in: ids } } }),
      prisma.client.v2RentalDemandLine.count({ where: { rentalId: { in: ids } } }),
      prisma.client.v2AssignedAsset.count({ where: { rentalId: { in: ids } } }),
      prisma.client.v2RentalOwnerSplit.count({ where: { rentalId: { in: ids } } }),
      ids.length
        ? prisma.client.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) AS count FROM v2_asset_blocks WHERE rental_id IN (${Prisma.join(ids)})
          `.then((rows) => Number(rows[0].count))
        : 0,
    ]);
    return { rentals: rentals.length, selections, demand, assignments, splits, blocks };
  }

  it('returns the dedicated duplicate-selection error without creating a commitment', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    const result = await create({
      ...setup,
      selectedOffers: [
        { rentalOfferId: catalog.offer.id, quantity: 1 },
        { rentalOfferId: catalog.offer.id, quantity: 1 },
      ],
    });

    expect(result.isErr() && result.error.code).toBe('rental_commitment.duplicate_rental_offer_selection');
    expect(await commitmentCounts(setup)).toEqual({
      rentals: 0,
      selections: 0,
      demand: 0,
      assignments: 0,
      splits: 0,
      blocks: 0,
    });
  });

  it('persists the complete confirmed commitment without an intermediate draft', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    const assetId = await candidate({ ...setup, equipmentTypeId: catalog.equipmentTypes[0].id });

    const result = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] });
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;

    const state = await persisted(result.value.rentalId);
    expect(state.rental).toEqual(
      expect.objectContaining({
        tenantId: setup.tenantId,
        branchId: setup.branchId,
        customerId: setup.customerId,
        status: 'CONFIRMED',
        periodStart: period().start,
        periodEnd: period().end,
      }),
    );
    expect(state.rental.confirmedAt).not.toBeNull();
    expect(state.rental.selections).toEqual([
      expect.objectContaining({
        rentalOfferId: catalog.offer.id,
        rentableItemId: catalog.item.id,
        rentableItemNameSnapshot: catalog.item.name,
        quantity: 1,
      }),
    ]);
    expect(state.rental.demandLines).toEqual([
      expect.objectContaining({
        rentalSelectionId: state.rental.selections[0].id,
        equipmentTypeId: catalog.equipmentTypes[0].id,
        quantity: 1,
      }),
    ]);
    expect(state.rental.assignedAssets).toEqual([
      expect.objectContaining({ rentalDemandLineId: state.rental.demandLines[0].id, assetId }),
    ]);
    expect(state.blocks).toEqual([expect.objectContaining({ assetId, blockType: 'EQUIPMENT', releasedAt: null })]);
    expect(state.blocks[0].period).toContain('2030-01-07 10:00:00+00');
    expect(state.blocks[0].period).toContain('2030-01-07 12:00:00+00');
    expect(state.rental.priceSnapshot).toEqual(
      expect.objectContaining({ schema: 'v2.rental-price-snapshot', version: 1, context: 'CONFIRMED' }),
    );
    expect(state.rental.ownerSplits).toHaveLength(0);
  });

  it('derives separate authoritative demand lines using selection quantity times quantityPerItem', async () => {
    const setup = await scenario();
    const catalog = await offer({ ...setup, requirements: [{ quantityPerItem: 3 }, { quantityPerItem: 2 }] });
    for (const [index, equipmentType] of catalog.equipmentTypes.entries()) {
      for (let count = 0; count < (index === 0 ? 6 : 4); count += 1) {
        await candidate({ ...setup, equipmentTypeId: equipmentType.id });
      }
    }

    const result = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 2 }] });
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const state = await persisted(result.value.rentalId);
    expect(state.rental.selections).toHaveLength(1);
    expect(state.rental.selections[0].quantity).toBe(2);
    expect(
      state.rental.demandLines
        .map((line) => ({ equipmentTypeId: line.equipmentTypeId, quantity: line.quantity }))
        .sort((a, b) => a.equipmentTypeId.localeCompare(b.equipmentTypeId)),
    ).toEqual(
      [
        { equipmentTypeId: catalog.equipmentTypes[0].id, quantity: 6 },
        { equipmentTypeId: catalog.equipmentTypes[1].id, quantity: 4 },
      ].sort((a, b) => a.equipmentTypeId.localeCompare(b.equipmentTypeId)),
    );
    expect(state.rental.assignedAssets).toHaveLength(10);
    expect(new Set(state.rental.assignedAssets.map((assignment) => assignment.assetId)).size).toBe(10);
  });

  it('allocates multiple offers collectively and leaves zero residue when combined inventory is insufficient', async () => {
    const setup = await scenario();
    const equipmentType = await prisma.client.v2EquipmentType.create({
      data: { tenantId: setup.tenantId, name: `Shared ${randomUUID()}` },
    });
    const first = await offer({ ...setup, requirements: [{ equipmentTypeId: equipmentType.id }] });
    const second = await offer({ ...setup, requirements: [{ equipmentTypeId: equipmentType.id }] });
    await candidate({ ...setup, equipmentTypeId: equipmentType.id });

    const result = await create({
      ...setup,
      selectedOffers: [
        { rentalOfferId: first.offer.id, quantity: 1 },
        { rentalOfferId: second.offer.id, quantity: 1 },
      ],
    });
    expect(result.isErr() && result.error.code).toBe('rental_commitment.insufficient_asset_availability');
    expect(await commitmentCounts(setup)).toEqual({
      rentals: 0,
      selections: 0,
      demand: 0,
      assignments: 0,
      splits: 0,
      blocks: 0,
    });
  });

  it.each([
    ['ends at the existing start', period(utcDate(2030, 1, 7, 8), utcDate(2030, 1, 7, 10)), true],
    ['starts at the existing end', period(utcDate(2030, 1, 7, 12), utcDate(2030, 1, 7, 14)), true],
    ['overlaps', period(utcDate(2030, 1, 7, 11), utcDate(2030, 1, 7, 13)), false],
    [
      'overlaps by one millisecond',
      period(utcDate(2030, 1, 7, 8), oneMillisecondAfter(utcDate(2030, 1, 7, 10))),
      false,
    ],
  ])('uses half-open block semantics when the requested period %s', async (_name, requestedPeriod, succeeds) => {
    const setup = await scenario();
    const catalog = await offer(setup);
    const assetId = await candidate({ ...setup, equipmentTypeId: catalog.equipmentTypes[0].id });
    const blocker = await confirmationFixtures.createRental({
      tenantId: setup.tenantId,
      branchId: setup.branchId,
      customerId: setup.customerId,
      status: 'CONFIRMED',
      period: { start: utcDate(2030, 1, 7, 10), end: utcDate(2030, 1, 7, 12) },
    });
    await confirmationFixtures.createActiveBlock({
      tenantId: setup.tenantId,
      rentalId: blocker.rentalId,
      assetId,
      period: { start: utcDate(2030, 1, 7, 10), end: utcDate(2030, 1, 7, 12) },
    });

    const result = await create({
      ...setup,
      selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }],
      rentalPeriod: requestedPeriod,
    });
    expect(result.isOk()).toBe(succeeds);
  });

  it('ignores a released overlapping block and preserves it as history', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    const assetId = await candidate({ ...setup, equipmentTypeId: catalog.equipmentTypes[0].id });
    const historical = await confirmationFixtures.createRental({
      tenantId: setup.tenantId,
      branchId: setup.branchId,
      customerId: setup.customerId,
      status: 'CANCELLED',
      period: { start: period().start, end: period().end },
    });
    const releasedBlockId = await confirmationFixtures.createActiveBlock({
      tenantId: setup.tenantId,
      rentalId: historical.rentalId,
      assetId,
      period: { start: period().start, end: period().end },
      releasedAt: utcDate(2029, 12, 1),
    });

    const result = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] });
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect((await persisted(result.value.rentalId)).blocks).toHaveLength(1);
    expect(await prisma.client.v2AssetBlock.findUnique({ where: { id: releasedBlockId } })).not.toBeNull();
  });

  it.each([
    ['inactive asset status projection', { assetStatus: 'INACTIVE' as const }],
    ['wrong branch projection', { branchId: randomUUID() }],
    ['third-party projection without owner contract', { ownershipKind: 'THIRD_PARTY' as const, ownerId: randomUUID() }],
  ])('enforces V2RentalAssetCandidate projection-policy eligibility: %s', async (_name, overrides) => {
    const setup = await scenario();
    const catalog = await offer(setup);
    await candidate({ ...setup, equipmentTypeId: catalog.equipmentTypes[0].id, overrides });
    const result = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] });
    expect(result.isErr() && result.error.code).toBe('rental_commitment.insufficient_asset_availability');
  });

  it('persists a third-party owner split from the assigned ownership snapshot and accepted price', async () => {
    const setup = await scenario();
    const catalog = await offer({ ...setup, pricePerDay: '100.00' });
    const ownerId = randomUUID();
    const contractId = randomUUID();
    const assetId = await candidate({
      ...setup,
      equipmentTypeId: catalog.equipmentTypes[0].id,
      overrides: {
        ownershipKind: 'THIRD_PARTY',
        ownerId,
        ownerContractSnapshot: { ownerId, contractId, ownerShare: 0.4, rentalShare: 0.6, basis: 'NET' },
      },
    });

    const result = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] });
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const state = await persisted(result.value.rentalId);
    expect(state.rental.ownerSplits).toHaveLength(1);
    expect(state.rental.ownerSplits[0]).toMatchObject({ assetId, ownerId, contractId, currency: 'USD' });
    expect(state.rental.ownerSplits[0].basisAmount.toString()).toBe('100');
    expect(state.rental.ownerSplits[0].ownerAmount.toString()).toBe('40');
  });

  it.each(['PICKUP', 'DELIVERY'] as const)('persists valid %s fulfillment', async (fulfillmentMethod) => {
    const setup = await scenario({ supportsDelivery: true });
    const catalog = await offer(setup);
    await candidate({ ...setup, equipmentTypeId: catalog.equipmentTypes[0].id });
    const result = await create({
      ...setup,
      selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }],
      fulfillmentMethod,
      deliveryDetails:
        fulfillmentMethod === 'DELIVERY' ? { addressLine1: '1 Test Street', city: 'Test City' } : undefined,
    });
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const state = await persisted(result.value.rentalId);
    expect(state.rental.fulfillmentMethod).toBe(fulfillmentMethod);
    expect(state.rental.deliveryDetails).toEqual(
      fulfillmentMethod === 'DELIVERY'
        ? expect.objectContaining({ addressLine1: '1 Test Street', city: 'Test City' })
        : null,
    );
  });

  it('maps authoritative Catalog availability outcomes without writing', async () => {
    const setup = await scenario();
    const unavailable = await offer({ ...setup, rentable: false });
    const inactiveItem = await offer(setup);
    await prisma.client.v2RentableItem.update({ where: { id: inactiveItem.item.id }, data: { status: 'ARCHIVED' } });
    const invalidFulfillment = await offer(setup);
    await prisma.client.v2RentableItemRequirement.deleteMany({
      where: { rentableItemId: invalidFulfillment.item.id },
    });

    const notFound = await create({ ...setup, selectedOffers: [{ rentalOfferId: randomUUID(), quantity: 1 }] });
    expect(notFound.isErr() && notFound.error.code).toBe('rental_commitment.rental_offer_not_found');

    for (const rentalOfferId of [unavailable.offer.id, inactiveItem.offer.id]) {
      const unavailableSelection = await create({
        ...setup,
        selectedOffers: [{ rentalOfferId, quantity: 1 }],
      });
      expect(unavailableSelection.isErr() && unavailableSelection.error.code).toBe(
        'rental_commitment.catalog_selection_unavailable',
      );
    }

    const invalidDefinition = await create({
      ...setup,
      selectedOffers: [{ rentalOfferId: invalidFulfillment.offer.id, quantity: 1 }],
    });
    expect(invalidDefinition.isErr() && invalidDefinition.error.code).toBe(
      'rental_commitment.invalid_fulfillment_definition',
    );

    expect(await commitmentCounts(setup)).toEqual({
      rentals: 0,
      selections: 0,
      demand: 0,
      assignments: 0,
      splits: 0,
      blocks: 0,
    });
  });

  it('publishes one confirmation event on success and none on failure', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    const events: RentalConfirmedIntegrationEvent[] = [];
    const listener = (event: RentalConfirmedIntegrationEvent) => events.push(event);
    emitter.on(RentalConfirmedIntegrationEvent.name, listener);
    try {
      const failed = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] });
      expect(failed.isErr()).toBe(true);
      expect(events).toHaveLength(0);
      await candidate({ ...setup, equipmentTypeId: catalog.equipmentTypes[0].id });
      const succeeded = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] });
      expect(succeeded.isOk()).toBe(true);
      expect(events).toHaveLength(1);
      if (succeeded.isOk()) {
        const state = await persisted(succeeded.value.rentalId);
        expect(events[0]).toEqual(
          expect.objectContaining({
            schemaVersion: 3,
            rentalId: succeeded.value.rentalId,
            rentalNumber: state.rental.rentalNumber,
          }),
        );
      }
    } finally {
      emitter.off(RentalConfirmedIntegrationEvent.name, listener);
    }
  });

  it('prevents double booking between competing direct creates without loser residue', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    const assetId = await candidate({ ...setup, equipmentTypeId: catalog.equipmentTypes[0].id });
    const outcomes = await runConcurrently([
      () => create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] }),
      () => create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] }),
    ]);
    expect(outcomes.every((outcome) => outcome.status === 'fulfilled')).toBe(true);
    const results = outcomes.map(
      (outcome) => (outcome as PromiseFulfilledResult<CreateConfirmedRentalServiceResult>).value,
    );
    expect(results.filter((result) => result.isOk())).toHaveLength(1);
    expect(
      results.filter(
        (result) => result.isErr() && result.error.code === 'rental_commitment.insufficient_asset_availability',
      ),
    ).toHaveLength(1);
    const rentals = await prisma.client.v2Rental.findMany({
      where: { tenantId: setup.tenantId, branchId: setup.branchId, customerId: setup.customerId },
      include: { selections: true, demandLines: true, assignedAssets: true, ownerSplits: true },
    });
    expect(rentals).toHaveLength(1);
    expect(rentals[0].assignedAssets).toEqual([expect.objectContaining({ assetId })]);
    expect(rentals[0].selections).toHaveLength(1);
    expect(rentals[0].demandLines).toHaveLength(1);
  });

  it('prevents double booking between direct create and ordinary confirmation', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    const assetId = await candidate({ ...setup, equipmentTypeId: catalog.equipmentTypes[0].id });
    const draft = await confirmationFixtures.createRental({
      tenantId: setup.tenantId,
      branchId: setup.branchId,
      customerId: setup.customerId,
      period: { start: period().start, end: period().end },
      demands: [{ equipmentTypeId: catalog.equipmentTypes[0].id }],
    });

    const outcomes = await runConcurrently<CreateConfirmedRentalServiceResult | ConfirmRentalResult>([
      () => create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] }),
      () => commandBus.execute(new ConfirmRentalCommand(setup.tenantId, draft.rentalId)),
    ]);
    expect(outcomes.every((outcome) => outcome.status === 'fulfilled')).toBe(true);
    const directOutcome = outcomes[0] as PromiseFulfilledResult<CreateConfirmedRentalServiceResult>;
    const directRentalIds = directOutcome.value.isOk() ? [directOutcome.value.value.rentalId] : [];
    const states = await prisma.client.v2Rental.findMany({
      where: { id: { in: [draft.rentalId, ...directRentalIds] } },
      include: { selections: true, demandLines: true, assignedAssets: true, ownerSplits: true },
    });
    expect(states.filter((rental) => rental.status === 'CONFIRMED')).toHaveLength(1);
    expect(
      states.flatMap((rental) => rental.assignedAssets).filter((assignment) => assignment.assetId === assetId),
    ).toHaveLength(1);
    const loserDraft = states.find((rental) => rental.id === draft.rentalId && rental.status === 'DRAFT');
    if (loserDraft) {
      expect(loserDraft.assignedAssets).toHaveLength(0);
      expect(loserDraft.ownerSplits).toHaveLength(0);
    }
  });
});
