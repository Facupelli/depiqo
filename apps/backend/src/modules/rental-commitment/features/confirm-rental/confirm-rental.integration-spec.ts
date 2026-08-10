import { randomUUID } from 'node:crypto';

import { CommandBus } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { V2RentalStatus } from 'src/generated/prisma/enums';
import { createE2ETestApp, E2ETestApp } from '../../../../../test/support/create-e2e-test-app';
import { useIntegrationTestContext } from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { createBarrier, runConcurrently } from '../../../../../test/support/concurrency';
import { oneMillisecondAfter, oneMillisecondBefore, utcDate } from '../../../../../test/support/time';

import { RentalRepository } from '../../persistence/rental.repository';
import { ConfirmRentalCommand } from './confirm-rental.command';
import { ConfirmRentalResult } from './confirm-rental.handler';
import { ConfirmRentalFixtures, RentalPeriodFixture } from './testing/confirm-rental.fixtures';

describe('ConfirmRental integration', () => {
  let testApp: E2ETestApp;
  let prisma: PrismaService;
  let commandBus: CommandBus;
  let coreFixtures: TestFixtures;
  let rentalFixtures: ConfirmRentalFixtures;

  useIntegrationTestContext(async () => {
    testApp = await createE2ETestApp({ databaseUrl: process.env.DATABASE_URL! });
    prisma = testApp.app.get(PrismaService);
    commandBus = testApp.app.get(CommandBus);
    coreFixtures = createTestFixtures(prisma);
    rentalFixtures = new ConfirmRentalFixtures(prisma);
    return testApp;
  });

  async function base(status: V2RentalStatus = 'DRAFT', period = periodBetween(10, 12)) {
    const tenant = await coreFixtures.createTenant();
    const branch = await coreFixtures.createBranch({ tenantId: tenant.id });
    const { customer } = await coreFixtures.createRentalCustomer({ tenantId: tenant.id });
    const rental = await rentalFixtures.createRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      status,
      period,
    });
    return { tenant, branch, customer, rental };
  }

  async function confirm(tenantId: string, rentalId: string): Promise<ConfirmRentalResult> {
    return commandBus.execute(new ConfirmRentalCommand(tenantId, rentalId));
  }

  async function persisted(rentalId: string) {
    const rental = await prisma.client.v2Rental.findUniqueOrThrow({
      where: { id: rentalId },
      include: { demandLines: true, assignedAssets: true, ownerSplits: true },
    });
    const blocks = await prisma.client.$queryRaw<
      Array<{
        id: string;
        tenantId: string;
        rentalId: string;
        assetId: string;
        period: string;
        releasedAt: Date | null;
      }>
    >`
      SELECT id, tenant_id AS "tenantId", rental_id AS "rentalId", asset_id AS "assetId",
             period::text AS period, released_at AS "releasedAt"
      FROM v2_asset_blocks WHERE rental_id = ${rentalId}
    `;
    return { rental, blocks };
  }

  async function expectUnconfirmed(rentalId: string, expectedStatus: V2RentalStatus = 'DRAFT') {
    const state = await persisted(rentalId);
    expect(state.rental.status).toBe(expectedStatus);
    expect(state.rental.confirmedAt).toBeNull();
    expect(state.rental.assignedAssets).toHaveLength(0);
    expect(state.blocks).toHaveLength(0);
    expect(state.rental.ownerSplits).toHaveLength(0);
  }

  it.each(['DRAFT', 'PENDING'] as const)(
    'confirms a valid %s rental and persists its complete state',
    async (status) => {
      const scenario = await base(status);
      const assetId = await rentalFixtures.createCandidate({
        tenantId: scenario.tenant.id,
        branchId: scenario.branch.id,
        equipmentTypeId: scenario.rental.equipmentTypeIds[0],
      });

      const result = await confirm(scenario.tenant.id, scenario.rental.rentalId);
      expect(result.isOk()).toBe(true);

      const state = await persisted(scenario.rental.rentalId);
      expect(state.rental.status).toBe('CONFIRMED');
      expect(state.rental.confirmedAt).not.toBeNull();
      expect(state.rental.priceSnapshot).toEqual(scenario.rental.priceSnapshot);
      expect(state.rental.demandLines).toHaveLength(1);
      expect(state.rental.assignedAssets).toEqual([
        expect.objectContaining({
          tenantId: scenario.tenant.id,
          rentalId: scenario.rental.rentalId,
          rentalDemandLineId: scenario.rental.demandLineIds[0],
          assetId,
        }),
      ]);
      expect(state.blocks).toEqual([
        expect.objectContaining({
          tenantId: scenario.tenant.id,
          rentalId: scenario.rental.rentalId,
          assetId,
          releasedAt: null,
        }),
      ]);
      expect(state.blocks[0].period).toContain('2030-01-01 10:00:00+00');
      expect(state.blocks[0].period).toContain('2030-01-01 12:00:00+00');
      expect(state.rental.ownerSplits).toHaveLength(0);
    },
  );

  it('persists third-party owner splits from accepted final pricing after a manual target-total adjustment', async () => {
    const scenario = await base();
    const calculated = {
      currency: 'USD',
      subtotal: '100.00',
      discountTotal: '0.00',
      total: '100.00',
      chargedDays: 1,
      lines: [{ rentalSelectionId: scenario.rental.selectionIds[0], total: '100.00' }],
      appliedPromotions: [],
      durationPolicySnapshot: { dailyBillingPolicy: 'CALENDAR_DAY' },
    };
    const final = {
      ...calculated,
      total: '80.00',
      lines: [{ rentalSelectionId: scenario.rental.selectionIds[0], total: '80.00' }],
    };
    await prisma.client.v2Rental.update({
      where: { id: scenario.rental.rentalId },
      data: {
        priceSnapshot: {
          schema: 'v2.rental-price-snapshot',
          version: 1,
          calculatedAtIso: '2030-01-01T00:00:00.000Z',
          context: 'DRAFT',
          calculated,
          final,
          manualPricingAdjustment: {
            mode: 'TARGET_TOTAL',
            targetTotal: '80.00',
            previousTotal: '100.00',
            direction: 'DECREASE',
            adjustmentTotal: '20.00',
            setByTenantUserId: 'test-user',
            setAtIso: '2030-01-01T00:00:00.000Z',
          },
        },
      },
    });

    const ownerId = randomUUID();
    const contractId = randomUUID();
    await rentalFixtures.createCandidate({
      tenantId: scenario.tenant.id,
      branchId: scenario.branch.id,
      equipmentTypeId: scenario.rental.equipmentTypeIds[0],
      overrides: {
        ownershipKind: 'THIRD_PARTY',
        ownerId,
        ownerContractSnapshot: { ownerId, contractId, ownerShare: 0.4, rentalShare: 0.6, basis: 'NET' },
      },
    });

    expect((await confirm(scenario.tenant.id, scenario.rental.rentalId)).isOk()).toBe(true);

    const state = await persisted(scenario.rental.rentalId);
    expect(state.rental.ownerSplits).toHaveLength(1);
    expect(state.rental.ownerSplits[0]).toMatchObject({ ownerId, contractId, currency: 'USD' });
    expect(state.rental.ownerSplits[0].basisAmount.toString()).toBe('80');
    expect(state.rental.ownerSplits[0].ownerAmount.toString()).toBe('32');
    expect(
      state.rental.ownerSplits
        .reduce((total, split) => total.plus(split.basisAmount), new Prisma.Decimal(0))
        .toString(),
    ).toBe(final.lines[0].total.replace(/\.00$/, ''));
  });

  it('fulfills a two-unit requirement with two distinct assets', async () => {
    const scenario = await base();
    await prisma.client.v2RentalDemandLine.update({
      where: { id: scenario.rental.demandLineIds[0] },
      data: { quantity: 2 },
    });
    const assets = await Promise.all(
      [0, 1].map(() =>
        rentalFixtures.createCandidate({
          tenantId: scenario.tenant.id,
          branchId: scenario.branch.id,
          equipmentTypeId: scenario.rental.equipmentTypeIds[0],
        }),
      ),
    );

    expect((await confirm(scenario.tenant.id, scenario.rental.rentalId)).isOk()).toBe(true);
    const state = await persisted(scenario.rental.rentalId);
    expect(new Set(state.rental.assignedAssets.map((assignment) => assignment.assetId))).toEqual(new Set(assets));
    expect(new Set(state.blocks.map((block) => block.assetId))).toEqual(new Set(assets));
  });

  it('leaves zero confirmation state when a two-unit requirement has only one eligible asset', async () => {
    const scenario = await base();
    await prisma.client.v2RentalDemandLine.update({
      where: { id: scenario.rental.demandLineIds[0] },
      data: { quantity: 2 },
    });
    await rentalFixtures.createCandidate({
      tenantId: scenario.tenant.id,
      branchId: scenario.branch.id,
      equipmentTypeId: scenario.rental.equipmentTypeIds[0],
    });

    const result = await confirm(scenario.tenant.id, scenario.rental.rentalId);
    expect(result.isErr() && result.error.code).toBe('rental_commitment.insufficient_asset_availability');
    await expectUnconfirmed(scenario.rental.rentalId);
  });

  it('completely fulfills multiple demand lines', async () => {
    const initial = await base();
    const rental = await rentalFixtures.createRental({
      tenantId: initial.tenant.id,
      branchId: initial.branch.id,
      customerId: initial.customer.id,
      period: periodBetween(10, 12),
      demands: [{ quantity: 1 }, { quantity: 2 }],
    });
    for (const [index, equipmentTypeId] of rental.equipmentTypeIds.entries()) {
      for (let count = 0; count < (index === 0 ? 1 : 2); count += 1) {
        await rentalFixtures.createCandidate({
          tenantId: initial.tenant.id,
          branchId: initial.branch.id,
          equipmentTypeId,
        });
      }
    }

    expect((await confirm(initial.tenant.id, rental.rentalId)).isOk()).toBe(true);
    const state = await persisted(rental.rentalId);
    expect(state.rental.assignedAssets).toHaveLength(3);
    expect(state.blocks).toHaveLength(3);
  });

  it('is atomically unchanged when a later demand line cannot be planned', async () => {
    const initial = await base();
    const rental = await rentalFixtures.createRental({
      tenantId: initial.tenant.id,
      branchId: initial.branch.id,
      customerId: initial.customer.id,
      period: periodBetween(10, 12),
      demands: [{}, {}],
    });
    await rentalFixtures.createCandidate({
      tenantId: initial.tenant.id,
      branchId: initial.branch.id,
      equipmentTypeId: rental.equipmentTypeIds[0],
    });

    const result = await confirm(initial.tenant.id, rental.rentalId);
    expect(result.isErr() && result.error.code).toBe('rental_commitment.insufficient_asset_availability');
    await expectUnconfirmed(rental.rentalId);
  });

  it.each([
    ['inactive asset flag', { isActive: false }],
    ['non-rentable asset flag', { isRentable: false }],
    ['inactive asset status', { assetStatus: 'INACTIVE' as const }],
    ['retired asset status', { assetStatus: 'RETIRED' as const }],
    ['inactive equipment type projection', { equipmentTypeIsActive: false }],
    ['wrong equipment type projection', { equipmentTypeId: 'wrong-equipment-type' }],
    ['wrong branch projection', { branchId: 'wrong-branch' }],
  ])('enforces the V2RentalAssetCandidate eligibility contract: %s', async (_name, overrides) => {
    const scenario = await base();
    await rentalFixtures.createCandidate({
      tenantId: scenario.tenant.id,
      branchId: scenario.branch.id,
      equipmentTypeId: scenario.rental.equipmentTypeIds[0],
      overrides,
    });

    const result = await confirm(scenario.tenant.id, scenario.rental.rentalId);
    expect(result.isErr() && result.error.code).toBe('rental_commitment.insufficient_asset_availability');
    await expectUnconfirmed(scenario.rental.rentalId);
  });

  describe('half-open block boundaries', () => {
    const cases: Array<[string, RentalPeriodFixture, boolean]> = [
      ['ends exactly at start', periodBetween(8, 10), true],
      ['starts exactly at end', periodBetween(12, 14), true],
      ['overlaps the start', periodBetween(9, 11), false],
      ['overlaps the end', periodBetween(11, 13), false],
      ['is identical', periodBetween(10, 12), false],
      ['contains the existing period', periodBetween(9, 13), false],
      [
        'is contained by the existing period',
        { start: utcDate(2030, 1, 1, 10, 30), end: utcDate(2030, 1, 1, 11) },
        false,
      ],
      [
        'ends one millisecond after start',
        { start: utcDate(2030, 1, 1, 8), end: oneMillisecondAfter(utcDate(2030, 1, 1, 10)) },
        false,
      ],
      [
        'starts one millisecond before end',
        { start: oneMillisecondBefore(utcDate(2030, 1, 1, 12)), end: utcDate(2030, 1, 1, 14) },
        false,
      ],
    ];

    it.each(cases)('%s', async (_name, requestedPeriod, succeeds) => {
      const scenario = await base('DRAFT', requestedPeriod);
      const assetId = await rentalFixtures.createCandidate({
        tenantId: scenario.tenant.id,
        branchId: scenario.branch.id,
        equipmentTypeId: scenario.rental.equipmentTypeIds[0],
      });
      const existing = await rentalFixtures.createRental({
        tenantId: scenario.tenant.id,
        branchId: scenario.branch.id,
        customerId: scenario.customer.id,
        period: periodBetween(10, 12),
        status: 'CONFIRMED',
      });
      await rentalFixtures.createActiveBlock({
        tenantId: scenario.tenant.id,
        rentalId: existing.rentalId,
        assetId,
        period: periodBetween(10, 12),
      });

      const result = await confirm(scenario.tenant.id, scenario.rental.rentalId);
      expect(result.isOk()).toBe(succeeds);
      if (!succeeds) await expectUnconfirmed(scenario.rental.rentalId);
    });
  });

  it('ignores a released block retained by a cancelled rental', async () => {
    const scenario = await base();
    const assetId = await rentalFixtures.createCandidate({
      tenantId: scenario.tenant.id,
      branchId: scenario.branch.id,
      equipmentTypeId: scenario.rental.equipmentTypeIds[0],
    });
    const cancelled = await rentalFixtures.createRental({
      tenantId: scenario.tenant.id,
      branchId: scenario.branch.id,
      customerId: scenario.customer.id,
      period: periodBetween(10, 12),
      status: 'CANCELLED',
    });
    await rentalFixtures.createActiveBlock({
      tenantId: scenario.tenant.id,
      rentalId: cancelled.rentalId,
      assetId,
      period: periodBetween(10, 12),
      releasedAt: utcDate(2029, 12, 1),
    });

    expect((await confirm(scenario.tenant.id, scenario.rental.rentalId)).isOk()).toBe(true);
  });

  it('rejects sequential repeat confirmation without duplicating persisted state', async () => {
    const scenario = await base();
    await rentalFixtures.createCandidate({
      tenantId: scenario.tenant.id,
      branchId: scenario.branch.id,
      equipmentTypeId: scenario.rental.equipmentTypeIds[0],
    });
    expect((await confirm(scenario.tenant.id, scenario.rental.rentalId)).isOk()).toBe(true);

    const repeated = await confirm(scenario.tenant.id, scenario.rental.rentalId);
    expect(repeated.isErr() && repeated.error.code).toBe('rental_commitment.rental_cannot_be_confirmed_from_status');
    const state = await persisted(scenario.rental.rentalId);
    expect(state.rental.assignedAssets).toHaveLength(1);
    expect(state.blocks).toHaveLength(1);
  });

  it('does not disclose or mutate a real foreign-tenant rental', async () => {
    const tenantA = await coreFixtures.createTenant();
    const scenarioB = await base();
    await rentalFixtures.createCandidate({
      tenantId: scenarioB.tenant.id,
      branchId: scenarioB.branch.id,
      equipmentTypeId: scenarioB.rental.equipmentTypeIds[0],
    });

    const result = await confirm(tenantA.id, scenarioB.rental.rentalId);
    expect(result.isErr() && result.error.code).toBe('rental_commitment.rental_not_found');
    await expectUnconfirmed(scenarioB.rental.rentalId);
  });

  it('requires a customer and an existing price snapshot without partial state', async () => {
    const scenario = await base();
    await prisma.client.v2Rental.update({ where: { id: scenario.rental.rentalId }, data: { customerId: null } });
    const missingCustomer = await confirm(scenario.tenant.id, scenario.rental.rentalId);
    expect(missingCustomer.isErr() && missingCustomer.error.code).toBe(
      'rental_commitment.rental_confirmation_requires_customer',
    );
    await expectUnconfirmed(scenario.rental.rentalId);

    await prisma.client.v2Rental.update({
      where: { id: scenario.rental.rentalId },
      data: { customerId: scenario.customer.id, priceSnapshot: Prisma.JsonNull },
    });
    await rentalFixtures.createCandidate({
      tenantId: scenario.tenant.id,
      branchId: scenario.branch.id,
      equipmentTypeId: scenario.rental.equipmentTypeIds[0],
    });
    const missingPrice = await confirm(scenario.tenant.id, scenario.rental.rentalId);
    expect(missingPrice.isErr() && missingPrice.error.code).toBe(
      'rental_commitment.confirmed_rental_requires_price_snapshot',
    );
    await expectUnconfirmed(scenario.rental.rentalId);
  });

  it('rolls back the losing transaction when two rentals compete for the final asset', async () => {
    const first = await base();
    const second = await rentalFixtures.createRental({
      tenantId: first.tenant.id,
      branchId: first.branch.id,
      customerId: first.customer.id,
      period: periodBetween(10, 12),
    });
    await prisma.client.v2RentalDemandLine.update({
      where: { id: second.demandLineIds[0] },
      data: { equipmentTypeId: first.rental.equipmentTypeIds[0] },
    });
    await rentalFixtures.createCandidate({
      tenantId: first.tenant.id,
      branchId: first.branch.id,
      equipmentTypeId: first.rental.equipmentTypeIds[0],
    });

    const outcomes = await runConcurrently([
      () => confirm(first.tenant.id, first.rental.rentalId),
      () => confirm(first.tenant.id, second.rentalId),
    ]);
    expect(outcomes.every((outcome) => outcome.status === 'fulfilled')).toBe(true);
    const results = outcomes.map((outcome) => (outcome as PromiseFulfilledResult<ConfirmRentalResult>).value);
    expect(results.filter((result) => result.isOk())).toHaveLength(1);
    expect(
      results.filter(
        (result) => result.isErr() && result.error.code === 'rental_commitment.insufficient_asset_availability',
      ),
    ).toHaveLength(1);

    const states = await Promise.all([persisted(first.rental.rentalId), persisted(second.rentalId)]);
    expect(states.filter((state) => state.rental.status === 'CONFIRMED')).toHaveLength(1);
    expect(states.find((state) => state.rental.status === 'CONFIRMED')!.rental.version).toBe(1);
    const loser = states.find((state) => state.rental.status === 'DRAFT')!;
    expect(loser.rental.version).toBe(0);
    expect(loser.rental.confirmedAt).toBeNull();
    expect(loser.rental.assignedAssets).toHaveLength(0);
    expect(loser.blocks).toHaveLength(0);
    expect(loser.rental.ownerSplits).toHaveLength(0);
    expect(states.flatMap((state) => state.blocks).filter((block) => block.releasedAt === null)).toHaveLength(1);
  });

  it('allows exactly one of two confirmations that evaluated the same rental version', async () => {
    const scenario = await base();
    await rentalFixtures.createCandidate({
      tenantId: scenario.tenant.id,
      branchId: scenario.branch.id,
      equipmentTypeId: scenario.rental.equipmentTypeIds[0],
    });
    const repository = testApp.app.get(RentalRepository);
    const originalFindById = repository.findById.bind(repository);
    const loaded = createBarrier(2);
    const findSpy = jest.spyOn(repository, 'findById').mockImplementation(async (tenantId, rentalId, tx) => {
      const rental = await originalFindById(tenantId, rentalId, tx);
      if (rentalId === scenario.rental.rentalId && !tx) await loaded.wait();
      return rental;
    });

    try {
      const outcomes = await runConcurrently([
        () => confirm(scenario.tenant.id, scenario.rental.rentalId),
        () => confirm(scenario.tenant.id, scenario.rental.rentalId),
      ]);
      expect(outcomes.every((outcome) => outcome.status === 'fulfilled')).toBe(true);
      const results = outcomes.map((outcome) => (outcome as PromiseFulfilledResult<ConfirmRentalResult>).value);
      expect(results.filter((result) => result.isOk())).toHaveLength(1);
      expect(
        results.filter((result) => result.isErr() && result.error.code === 'rental_commitment.rental_version_conflict'),
      ).toHaveLength(1);
    } finally {
      findSpy.mockRestore();
    }

    const state = await persisted(scenario.rental.rentalId);
    expect(state.rental.status).toBe('CONFIRMED');
    expect(state.rental.version).toBe(1);
    expect(state.rental.priceSnapshot).not.toBeNull();
    expect(new Set(state.rental.assignedAssets.map((assignment) => assignment.assetId)).size).toBe(1);
    expect(state.rental.assignedAssets).toHaveLength(1);
    expect(state.blocks.filter((block) => block.releasedAt === null)).toHaveLength(1);
    expect(state.rental.ownerSplits).toHaveLength(0);
  });
});

function periodBetween(startHour: number, endHour: number): RentalPeriodFixture {
  return { start: utcDate(2030, 1, 1, startHour), end: utcDate(2030, 1, 1, endHour) };
}
