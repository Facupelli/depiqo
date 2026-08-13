import { randomUUID } from 'node:crypto';
import { QueryBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  createRentalCommitmentIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { runConcurrently } from '../../../../../test/support/concurrency';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { oneMillisecondAfter, oneMillisecondBefore, utcDate } from '../../../../../test/support/time';
import { ConfirmRentalFixtures } from '../confirm-rental/testing/confirm-rental.fixtures';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { GetRentalOfferAvailabilityQuery } from './get-rental-offer-availability.query';
import { GetRentalOfferAvailabilityResult } from './get-rental-offer-availability.handler';

const requestedPeriod = { start: utcDate(2030, 1, 1, 10), end: utcDate(2030, 1, 1, 12) };

describe('GetRentalOfferAvailability integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let queryBus: QueryBus;
  let core: TestFixtures;
  let rentals: ConfirmRentalFixtures;

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    queryBus = moduleRef.get(QueryBus);
    core = createTestFixtures(prisma);
    rentals = new ConfirmRentalFixtures(prisma);
    return moduleRef;
  });

  async function setup() {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    return { tenant, branch };
  }

  async function equipmentType(tenantId: string) {
    return prisma.client.v2EquipmentType.create({
      data: { tenantId, name: `Equipment ${randomUUID()}` },
    });
  }

  async function offer(params: {
    tenantId: string;
    branchId: string;
    requirements: Array<{ equipmentTypeId: string; quantityPerItem: number }>;
    isVisible?: boolean;
    isRentable?: boolean;
    itemStatus?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  }) {
    const item = await prisma.client.v2RentableItem.create({
      data: {
        tenantId: params.tenantId,
        name: `Item ${randomUUID()}`,
        kind: params.requirements.length > 1 ? 'PACKAGE' : 'SINGLE',
        status: params.itemStatus ?? 'ACTIVE',
        requirements: {
          create: params.requirements.map((requirement) => ({ tenantId: params.tenantId, ...requirement })),
        },
      },
    });
    return prisma.client.v2RentalOffer.create({
      data: {
        tenantId: params.tenantId,
        branchId: params.branchId,
        rentableItemId: item.id,
        isVisible: params.isVisible ?? true,
        isRentable: params.isRentable ?? true,
      },
    });
  }

  async function availability(tenantId: string, branchId: string, offerIds: string[], period = requestedPeriod) {
    return queryBus.execute<GetRentalOfferAvailabilityQuery, GetRentalOfferAvailabilityResult>(
      new GetRentalOfferAvailabilityQuery(tenantId, branchId, new RentalPeriod(period.start, period.end), offerIds),
    );
  }

  async function value(tenantId: string, branchId: string, offerIds: string[], period = requestedPeriod) {
    const result = await availability(tenantId, branchId, offerIds, period);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    return result.value;
  }

  it('uses authoritative Catalog requirements and returns one-offer capacity', async () => {
    const s = await setup();
    const type = await equipmentType(s.tenant.id);
    const rentalOffer = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 1 }],
    });
    await rentals.createCandidate({ tenantId: s.tenant.id, branchId: s.branch.id, equipmentTypeId: type.id });

    await expect(value(s.tenant.id, s.branch.id, [rentalOffer.id])).resolves.toEqual([
      { rentalOfferId: rentalOffer.id, availableCount: 1 },
    ]);
  });

  it('floors inventory by quantity per item', async () => {
    const s = await setup();
    const type = await equipmentType(s.tenant.id);
    const rentalOffer = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 2 }],
    });
    for (let index = 0; index < 5; index++)
      await rentals.createCandidate({ tenantId: s.tenant.id, branchId: s.branch.id, equipmentTypeId: type.id });
    expect((await value(s.tenant.id, s.branch.id, [rentalOffer.id]))[0].availableCount).toBe(2);
  });

  it('uses the limiting capacity across multiple requirements', async () => {
    const s = await setup();
    const [camera, light] = await Promise.all([equipmentType(s.tenant.id), equipmentType(s.tenant.id)]);
    const rentalOffer = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [
        { equipmentTypeId: camera.id, quantityPerItem: 1 },
        { equipmentTypeId: light.id, quantityPerItem: 2 },
      ],
    });
    for (let index = 0; index < 3; index++)
      await rentals.createCandidate({ tenantId: s.tenant.id, branchId: s.branch.id, equipmentTypeId: camera.id });
    for (let index = 0; index < 3; index++)
      await rentals.createCandidate({ tenantId: s.tenant.id, branchId: s.branch.id, equipmentTypeId: light.id });
    expect((await value(s.tenant.id, s.branch.id, [rentalOffer.id]))[0].availableCount).toBe(1);
  });

  it('calculates each offer independently and preserves input ordering', async () => {
    const s = await setup();
    const type = await equipmentType(s.tenant.id);
    const first = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 1 }],
    });
    const second = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 1 }],
    });
    await rentals.createCandidate({ tenantId: s.tenant.id, branchId: s.branch.id, equipmentTypeId: type.id });
    expect(await value(s.tenant.id, s.branch.id, [second.id, first.id])).toEqual([
      { rentalOfferId: second.id, availableCount: 1 },
      { rentalOfferId: first.id, availableCount: 1 },
    ]);
  });

  it.each([
    ['before', utcDate(2030, 1, 1, 8), utcDate(2030, 1, 1, 10), 1],
    ['after', utcDate(2030, 1, 1, 12), utcDate(2030, 1, 1, 14), 1],
    ['overlap start', utcDate(2030, 1, 1, 9), utcDate(2030, 1, 1, 11), 0],
    ['overlap end', utcDate(2030, 1, 1, 11), utcDate(2030, 1, 1, 13), 0],
    ['equal', utcDate(2030, 1, 1, 10), utcDate(2030, 1, 1, 12), 0],
    ['contains', utcDate(2030, 1, 1, 9), utcDate(2030, 1, 1, 13), 0],
    ['contained', utcDate(2030, 1, 1, 10, 30), utcDate(2030, 1, 1, 11), 0],
    ['ends 1ms after start', utcDate(2030, 1, 1, 8), oneMillisecondAfter(utcDate(2030, 1, 1, 10)), 0],
    ['starts 1ms before end', oneMillisecondBefore(utcDate(2030, 1, 1, 12)), utcDate(2030, 1, 1, 14), 0],
  ])('applies half-open overlap semantics: %s', async (_name, start, end, expected) => {
    const s = await setup();
    const type = await equipmentType(s.tenant.id);
    const rentalOffer = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 1 }],
    });
    const assetId = await rentals.createCandidate({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      equipmentTypeId: type.id,
    });
    const blockingRental = await rentals.createRental({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      period: requestedPeriod,
    });
    await rentals.createActiveBlock({
      tenantId: s.tenant.id,
      rentalId: blockingRental.rentalId,
      assetId,
      period: requestedPeriod,
    });
    expect((await value(s.tenant.id, s.branch.id, [rentalOffer.id], { start, end }))[0].availableCount).toBe(expected);
  });

  it('ignores released and non-overlapping active blocks', async () => {
    const s = await setup();
    const type = await equipmentType(s.tenant.id);
    const rentalOffer = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 1 }],
    });
    const assets = await Promise.all(
      [0, 1].map(() =>
        rentals.createCandidate({ tenantId: s.tenant.id, branchId: s.branch.id, equipmentTypeId: type.id }),
      ),
    );
    const blockingRental = await rentals.createRental({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      period: requestedPeriod,
    });
    await rentals.createActiveBlock({
      tenantId: s.tenant.id,
      rentalId: blockingRental.rentalId,
      assetId: assets[0],
      period: requestedPeriod,
      releasedAt: utcDate(2030, 1, 1, 9),
    });
    await rentals.createActiveBlock({
      tenantId: s.tenant.id,
      rentalId: blockingRental.rentalId,
      assetId: assets[1],
      period: { start: utcDate(2030, 1, 1, 8), end: utcDate(2030, 1, 1, 10) },
    });
    expect((await value(s.tenant.id, s.branch.id, [rentalOffer.id]))[0].availableCount).toBe(2);
  });

  it('applies projection eligibility, tenant isolation, and branch isolation', async () => {
    const s = await setup();
    const otherTenant = await core.createTenant();
    const otherBranch = await core.createBranch({ tenantId: s.tenant.id });
    const type = await equipmentType(s.tenant.id);
    const rentalOffer = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 1 }],
    });
    await rentals.createCandidate({ tenantId: s.tenant.id, branchId: s.branch.id, equipmentTypeId: type.id });
    await rentals.createCandidate({ tenantId: s.tenant.id, branchId: otherBranch.id, equipmentTypeId: type.id });
    await rentals.createCandidate({ tenantId: otherTenant.id, branchId: s.branch.id, equipmentTypeId: type.id });
    for (const overrides of [{ assetStatus: 'INACTIVE' as const }]) {
      await rentals.createCandidate({
        tenantId: s.tenant.id,
        branchId: s.branch.id,
        equipmentTypeId: type.id,
        overrides,
      });
    }
    expect((await value(s.tenant.id, s.branch.id, [rentalOffer.id]))[0].availableCount).toBe(1);
  });

  it('does not count a third-party candidate without an owner contract snapshot', async () => {
    const s = await setup();
    const type = await equipmentType(s.tenant.id);
    const rentalOffer = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 1 }],
    });
    await rentals.createCandidate({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      equipmentTypeId: type.id,
      overrides: { ownershipKind: 'THIRD_PARTY', ownerId: randomUUID() },
    });
    expect((await value(s.tenant.id, s.branch.id, [rentalOffer.id]))[0].availableCount).toBe(0);
  });

  it('counts a third-party candidate with a valid owner contract snapshot', async () => {
    const s = await setup();
    const type = await equipmentType(s.tenant.id);
    const rentalOffer = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 1 }],
    });
    const ownerId = randomUUID();
    await rentals.createCandidate({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      equipmentTypeId: type.id,
      overrides: {
        ownershipKind: 'THIRD_PARTY',
        ownerId,
        ownerContractSnapshot: {
          ownerId,
          contractId: randomUUID(),
          ownerShare: '30',
          rentalShare: '70',
          basis: 'GROSS',
        },
      },
    });
    expect((await value(s.tenant.id, s.branch.id, [rentalOffer.id]))[0].availableCount).toBe(1);
  });

  it.each(['foreign', 'wrong branch'] as const)('does not disclose a %s offer', async (kind) => {
    const s = await setup();
    const foreign = await setup();
    const otherBranch = await core.createBranch({ tenantId: s.tenant.id });
    const owner = kind === 'foreign' ? foreign : s;
    const type = await equipmentType(owner.tenant.id);
    const rentalOffer = await offer({
      tenantId: owner.tenant.id,
      branchId: kind === 'wrong branch' ? otherBranch.id : owner.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 1 }],
    });
    const result = await availability(s.tenant.id, s.branch.id, [rentalOffer.id]);
    expect(result.isErr() && result.error.code).toBe('rental_commitment.rental_offer_not_found');
  });

  it('accepts a hidden but rentable offer and rejects unrentable and inactive offers', async () => {
    const s = await setup();
    const type = await equipmentType(s.tenant.id);
    const hidden = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 1 }],
      isVisible: false,
    });
    const unrentable = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 1 }],
      isRentable: false,
    });
    const inactive = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 1 }],
      itemStatus: 'DRAFT',
    });
    expect((await value(s.tenant.id, s.branch.id, [hidden.id]))[0].availableCount).toBe(0);
    expect((await availability(s.tenant.id, s.branch.id, [unrentable.id]))._unsafeUnwrapErr().code).toBe(
      'rental_commitment.rental_offer_not_rentable',
    );
    expect((await availability(s.tenant.id, s.branch.id, [inactive.id]))._unsafeUnwrapErr().code).toBe(
      'rental_commitment.rentable_item_not_active',
    );
  });

  it('is repeatable and concurrent reads do not persist side effects', async () => {
    const s = await setup();
    const type = await equipmentType(s.tenant.id);
    const rentalOffer = await offer({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      requirements: [{ equipmentTypeId: type.id, quantityPerItem: 1 }],
    });
    await rentals.createCandidate({ tenantId: s.tenant.id, branchId: s.branch.id, equipmentTypeId: type.id });
    const before = await persistenceCounts();
    expect(await value(s.tenant.id, s.branch.id, [rentalOffer.id])).toEqual(
      await value(s.tenant.id, s.branch.id, [rentalOffer.id]),
    );
    const outcomes = await runConcurrently([
      () => value(s.tenant.id, s.branch.id, [rentalOffer.id]),
      () => value(s.tenant.id, s.branch.id, [rentalOffer.id]),
    ]);
    expect(outcomes.every((outcome) => outcome.status === 'fulfilled' && outcome.value[0].availableCount === 1)).toBe(
      true,
    );
    expect(await persistenceCounts()).toEqual(before);
  });

  async function persistenceCounts() {
    const [rentalsCount, assignments, candidates, blocks] = await Promise.all([
      prisma.client.v2Rental.count(),
      prisma.client.v2AssignedAsset.count(),
      prisma.client.v2RentalAssetCandidate.count(),
      prisma.client.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM v2_asset_blocks`,
    ]);
    return { rentals: rentalsCount, assignments, candidates, blocks: Number(blocks[0].count) };
  }
});
