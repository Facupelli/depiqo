import { randomUUID } from 'node:crypto';

import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import {
  createRentalCommitmentIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { utcDate } from '../../../../../test/support/time';

import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { EditUnconfirmedRentalCommand } from '../edit-unconfirmed-rental/edit-unconfirmed-rental.command';
import { EditUnconfirmedRentalResult } from '../edit-unconfirmed-rental/edit-unconfirmed-rental.handler';
import { CreateDraftRentalCommand } from './create-draft-rental.command';
import { CreateDraftRentalServiceResult } from './create-draft-rental.service';

const period = () => new RentalPeriod(utcDate(2030, 1, 7, 10), utcDate(2030, 1, 9, 10));

type Scenario = { tenantId: string; branchId: string; customerId: string; tenantUserId: string };

describe('CreateDraftRental integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let commands: CommandBus;
  let core: TestFixtures;

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    commands = moduleRef.get(CommandBus);
    core = createTestFixtures(prisma);
    return moduleRef;
  });

  async function scenario(overrides: { supportsDelivery?: boolean } = {}): Promise<Scenario> {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({
      tenantId: tenant.id,
      overrides: { supportsDelivery: overrides.supportsDelivery ?? false },
    });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const { user } = await core.createTenantUser({ tenantId: tenant.id });
    return { tenantId: tenant.id, branchId: branch.id, customerId: customer.id, tenantUserId: user.id };
  }

  async function offer(
    input: Scenario & {
      equipmentTypeIds?: string[];
      quantitiesPerItem?: number[];
      pricePerDay?: string;
      rentable?: boolean;
      itemStatus?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    },
  ) {
    const quantities = input.quantitiesPerItem ?? [1];
    const equipmentTypes = await Promise.all(
      quantities.map((_, index) =>
        input.equipmentTypeIds?.[index]
          ? prisma.client.v2EquipmentType.findUniqueOrThrow({ where: { id: input.equipmentTypeIds[index] } })
          : prisma.client.v2EquipmentType.create({
              data: { tenantId: input.tenantId, name: `Equipment ${randomUUID()}` },
            }),
      ),
    );
    const item = await prisma.client.v2RentableItem.create({
      data: {
        tenantId: input.tenantId,
        name: `Item ${randomUUID()}`,
        kind: quantities.length > 1 ? 'PACKAGE' : 'SINGLE',
        status: input.itemStatus ?? 'ACTIVE',
        requirements: {
          create: quantities.map((quantityPerItem, index) => ({
            tenantId: input.tenantId,
            equipmentTypeId: equipmentTypes[index].id,
            quantityPerItem,
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

  function create(
    input: Scenario & {
      selectedOffers: Array<{ rentalOfferId: string; quantity: number }>;
      customerId?: string | null;
      fulfillmentMethod?: 'PICKUP' | 'DELIVERY';
      deliveryDetails?: { addressLine1: string; city: string };
      manualPricingAdjustment?: { mode: 'TARGET_TOTAL'; targetTotal: string; reason?: string };
    },
  ): Promise<CreateDraftRentalServiceResult> {
    return commands.execute(
      new CreateDraftRentalCommand({
        tenantId: input.tenantId,
        tenantUserId: input.tenantUserId,
        branchId: input.branchId,
        rentalCustomerId: input.customerId === null ? undefined : input.customerId,
        period: period(),
        selectedOffers: input.selectedOffers,
        fulfillmentMethod: input.fulfillmentMethod,
        deliveryDetails: input.deliveryDetails,
        manualPricingAdjustment: input.manualPricingAdjustment,
      }),
    );
  }

  async function state(rentalId: string) {
    const rental = await prisma.client.v2Rental.findUniqueOrThrow({
      where: { id: rentalId },
      include: { selections: true, demandLines: true, assignedAssets: true, ownerSplits: true, deliveryDetails: true },
    });
    const blocks = await prisma.client.$queryRaw<Array<{ blockType: string; releasedAt: Date | null }>>(Prisma.sql`
      SELECT block_type::text AS "blockType", released_at AS "releasedAt"
      FROM v2_asset_blocks WHERE rental_id = ${rentalId}
    `);
    return { rental, blocks };
  }

  async function rentalCount(setup: Scenario) {
    return prisma.client.v2Rental.count({ where: { tenantId: setup.tenantId, branchId: setup.branchId } });
  }

  it('persists commercial selection, authoritative demand, draft pricing, and no confirmed-only facts', async () => {
    const setup = await scenario();
    const catalog = await offer({ ...setup, quantitiesPerItem: [3, 2] });
    const result = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 2 }] });
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;

    const persisted = await state(result.value.rentalId);
    expect(persisted.rental).toEqual(
      expect.objectContaining({
        tenantId: setup.tenantId,
        branchId: setup.branchId,
        customerId: setup.customerId,
        status: 'DRAFT',
        fulfillmentMethod: 'PICKUP',
        source: 'STAFF',
        bookingSnapshot: null,
        confirmedAt: null,
        periodStart: period().start,
        periodEnd: period().end,
      }),
    );
    expect(persisted.rental.selections).toEqual([
      expect.objectContaining({
        rentalOfferId: catalog.offer.id,
        rentableItemId: catalog.item.id,
        rentableItemNameSnapshot: catalog.item.name,
        rentableItemKindSnapshot: catalog.item.kind,
        quantity: 2,
      }),
    ]);
    expect(
      persisted.rental.demandLines.map((line) => ({
        selectionId: line.rentalSelectionId,
        equipmentTypeId: line.equipmentTypeId,
        quantity: line.quantity,
      })),
    ).toEqual(
      expect.arrayContaining([
        { selectionId: persisted.rental.selections[0].id, equipmentTypeId: catalog.equipmentTypes[0].id, quantity: 6 },
        { selectionId: persisted.rental.selections[0].id, equipmentTypeId: catalog.equipmentTypes[1].id, quantity: 4 },
      ]),
    );
    expect(persisted.rental.priceSnapshot).toEqual(
      expect.objectContaining({
        schema: 'v2.rental-price-snapshot',
        version: 1,
        context: 'DRAFT',
      }),
    );
    expect(persisted.rental.priceSnapshot).not.toHaveProperty('manualPricingAdjustment');
    expect(persisted.rental.assignedAssets).toEqual([]);
    expect(persisted.blocks).toEqual([]);
    expect(persisted.rental.ownerSplits).toEqual([]);
  });

  it('allows pickup and return times outside branch schedules', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    const result = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] });

    expect(result.isOk()).toBe(true);
    expect(await prisma.client.v2BranchSchedule.count({ where: { branchId: setup.branchId } })).toBe(0);
  });

  it('supports a customerless staff draft', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    const result = await create({
      ...setup,
      customerId: null,
      selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }],
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect((await state(result.value.rentalId)).rental.customerId).toBeNull();
  });

  it('keeps same-equipment demand separate by source selection and does not consult inventory', async () => {
    const setup = await scenario();
    const equipment = await prisma.client.v2EquipmentType.create({
      data: { tenantId: setup.tenantId, name: `Shared ${randomUUID()}` },
    });
    const first = await offer({ ...setup, equipmentTypeIds: [equipment.id], quantitiesPerItem: [2] });
    const second = await offer({ ...setup, equipmentTypeIds: [equipment.id], quantitiesPerItem: [3] });
    const result = await create({
      ...setup,
      selectedOffers: [
        { rentalOfferId: first.offer.id, quantity: 2 },
        { rentalOfferId: second.offer.id, quantity: 2 },
      ],
    });
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const persisted = await state(result.value.rentalId);
    expect(persisted.rental.selections).toHaveLength(2);
    expect(persisted.rental.demandLines).toHaveLength(2);
    expect(persisted.rental.demandLines.map((line) => line.quantity).sort()).toEqual([4, 6]);
    expect(new Set(persisted.rental.demandLines.map((line) => line.rentalSelectionId)).size).toBe(2);
    expect(persisted.rental.assignedAssets).toEqual([]);
    expect(persisted.blocks).toEqual([]);
  });

  it('ignores an existing overlapping block and creates no reservation', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    const otherRental = await prisma.client.v2Rental.create({
      data: {
        tenantId: setup.tenantId,
        branchId: setup.branchId,
        status: 'DRAFT',
        periodStart: period().start,
        periodEnd: period().end,
      },
    });
    const assetId = randomUUID();
    await prisma.client.$executeRaw`
      INSERT INTO v2_asset_blocks (id, tenant_id, rental_id, asset_id, period, block_type, created_at)
      VALUES (${randomUUID()}, ${setup.tenantId}, ${otherRental.id}, ${assetId},
        ${period().toPostgresRange()}::tstzrange, 'EQUIPMENT', ${new Date()})
    `;
    const result = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 10 }] });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect((await state(result.value.rentalId)).blocks).toEqual([]);
    expect(await prisma.client.v2AssetBlock.count({ where: { rentalId: otherRental.id, releasedAt: null } })).toBe(1);
  });

  it('persists delivery details atomically', async () => {
    const setup = await scenario({ supportsDelivery: true });
    const catalog = await offer(setup);
    const result = await create({
      ...setup,
      selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }],
      fulfillmentMethod: 'DELIVERY',
      deliveryDetails: { addressLine1: '10 Rental Road', city: 'Test City' },
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const persisted = await state(result.value.rentalId);
      expect(persisted.rental.deliveryDetails).toEqual(
        expect.objectContaining({ addressLine1: '10 Rental Road', city: 'Test City' }),
      );
    }
  });

  it('persists a valid target-total adjustment', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    const result = await create({
      ...setup,
      selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }],
      manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal: '125.00', reason: 'Approved quote' },
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const snapshot = (await state(result.value.rentalId)).rental.priceSnapshot as {
        final: { total: string };
        manualPricingAdjustment: { targetTotal: string; setByTenantUserId: string; reason?: string };
      };
      expect(snapshot.final.total).toBe('125.00');
      expect(snapshot.manualPricingAdjustment).toEqual(
        expect.objectContaining({
          targetTotal: '125.00',
          setByTenantUserId: setup.tenantUserId,
          reason: 'Approved quote',
        }),
      );
    }
  });

  it.each(['not-money', '-1', '0'])(
    'returns typed invalid pricing for target total %s with zero writes',
    async (targetTotal) => {
      const setup = await scenario();
      const catalog = await offer(setup);
      const result = await create({
        ...setup,
        selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }],
        manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal },
      });
      expect(result.isErr() && result.error.code).toBe('rental_commitment.invalid_pricing_input');
      expect(await rentalCount(setup)).toBe(0);
    },
  );

  it('rejects duplicates without writing a draft', async () => {
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
    expect(await rentalCount(setup)).toBe(0);
  });

  it('returns the dedicated duplicate-selection error when editing an unconfirmed rental', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    const created = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] });
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;

    const existing = await state(created.value.rentalId);
    const result = await commands.execute<EditUnconfirmedRentalCommand, EditUnconfirmedRentalResult>(
      new EditUnconfirmedRentalCommand({
        tenantId: setup.tenantId,
        tenantUserId: setup.tenantUserId,
        rentalId: created.value.rentalId,
        expectedVersion: existing.rental.version,
        branchId: setup.branchId,
        period: period(),
        selectedOffers: [
          { rentalOfferId: catalog.offer.id, quantity: 1 },
          { rentalOfferId: catalog.offer.id, quantity: 1 },
        ],
        fulfillmentMethod: 'PICKUP',
      }),
    );

    expect(result.isErr() && result.error.code).toBe('rental_commitment.duplicate_rental_offer_selection');
    expect(await state(created.value.rentalId)).toEqual(existing);
  });

  it.each([
    ['unknown offer', async (_setup: Scenario) => randomUUID(), 'rental_commitment.rental_offer_not_found'],
    [
      'foreign offer',
      async (_setup: Scenario) => {
        const foreign = await scenario();
        return (await offer(foreign)).offer.id;
      },
      'rental_commitment.rental_offer_not_found',
    ],
    [
      'wrong branch offer',
      async (setup: Scenario) => {
        const branch = await core.createBranch({ tenantId: setup.tenantId });
        return (await offer({ ...setup, branchId: branch.id })).offer.id;
      },
      'rental_commitment.rental_offer_not_found',
    ],
  ])('maps %s and leaves zero state', async (_name, getOfferId, code) => {
    const setup = await scenario();
    const result = await create({
      ...setup,
      selectedOffers: [{ rentalOfferId: await getOfferId(setup), quantity: 1 }],
    });
    expect(result.isErr() && result.error.code).toBe(code);
    expect(await rentalCount(setup)).toBe(0);
  });

  it.each([
    ['unrentable offer', { rentable: false }, 'rental_commitment.catalog_selection_unavailable'],
    ['inactive item', { itemStatus: 'ARCHIVED' as const }, 'rental_commitment.catalog_selection_unavailable'],
  ])('maps %s and leaves zero state', async (_name, catalogOverrides, code) => {
    const setup = await scenario();
    const catalog = await offer({ ...setup, ...catalogOverrides });
    const result = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] });
    expect(result.isErr() && result.error.code).toBe(code);
    expect(await rentalCount(setup)).toBe(0);
  });

  it('maps an invalid fulfillment definition and leaves zero state', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    await prisma.client.v2RentableItemRequirement.deleteMany({ where: { rentableItemId: catalog.item.id } });
    const result = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] });
    expect(result.isErr() && result.error.code).toBe('rental_commitment.invalid_fulfillment_definition');
    expect(await rentalCount(setup)).toBe(0);
  });

  it('maps a missing requirement equipment type and leaves zero state', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    await prisma.client.v2EquipmentType.delete({ where: { id: catalog.equipmentTypes[0].id } });
    const result = await create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] });
    expect(result.isErr() && result.error.code).toBe('rental_commitment.equipment_type_not_found');
    expect(await rentalCount(setup)).toBe(0);
  });

  it('rejects an inactive branch, foreign customer, missing pricing, and unsupported delivery without writes', async () => {
    const setup = await scenario();
    const catalog = await offer(setup);
    const foreign = await scenario();
    const cases = [
      async () => {
        await prisma.client.v2Branch.update({ where: { id: setup.branchId }, data: { isActive: false } });
        return create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] });
      },
      async () => {
        await prisma.client.v2Branch.update({ where: { id: setup.branchId }, data: { isActive: true } });
        return create({
          ...setup,
          customerId: foreign.customerId,
          selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }],
        });
      },
      async () =>
        create({
          ...setup,
          selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }],
          fulfillmentMethod: 'DELIVERY',
          deliveryDetails: { addressLine1: 'A', city: 'B' },
        }),
      async () => {
        await prisma.client.v2RentalOfferPricing.deleteMany({ where: { catalogRentalOfferId: catalog.offer.id } });
        return create({ ...setup, selectedOffers: [{ rentalOfferId: catalog.offer.id, quantity: 1 }] });
      },
    ];
    const expected = [
      'rental_commitment.branch_unavailable',
      'rental_commitment.customer_unavailable',
      'rental_commitment.unsupported_branch_fulfillment_method',
      'rental_commitment.invalid_pricing_input',
    ];
    for (const [index, run] of cases.entries()) {
      const result = await run();
      expect(result.isErr() && result.error.code).toBe(expected[index]);
    }
    expect(await rentalCount(setup)).toBe(0);
  });
});
