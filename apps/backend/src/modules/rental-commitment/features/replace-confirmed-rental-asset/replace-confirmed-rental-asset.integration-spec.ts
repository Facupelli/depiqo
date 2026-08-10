import { CommandBus } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { V2ContractStatus, V2RentalStatus } from 'src/generated/prisma/enums';
import { createE2ETestApp, E2ETestApp } from '../../../../../test/support/create-e2e-test-app';
import { createBarrier, runConcurrently } from '../../../../../test/support/concurrency';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { oneMillisecondAfter, utcDate } from '../../../../../test/support/time';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { RentalRepository } from '../../persistence/rental.repository';
import { CancelRentalCommand } from '../cancel-rental/cancel-rental.command';
import { CancelRentalResult } from '../cancel-rental/cancel-rental.handler';
import { ConfirmRentalCommand } from '../confirm-rental/confirm-rental.command';
import { ConfirmRentalResult } from '../confirm-rental/confirm-rental.handler';
import { ConfirmRentalFixtures } from '../confirm-rental/testing/confirm-rental.fixtures';
import { EditConfirmedRentalCommand } from '../edit-confirmed-rental/edit-confirmed-rental.command';
import { EditConfirmedRentalResult } from '../edit-confirmed-rental/edit-confirmed-rental.handler';
import { EditConfirmedRentalFixtures } from '../edit-confirmed-rental/testing/edit-confirmed-rental.fixtures';
import { ReplaceConfirmedRentalAssetCommand } from './replace-confirmed-rental-asset.command';
import { ReplaceConfirmedRentalAssetResult } from './replace-confirmed-rental-asset.handler';

describe('ReplaceConfirmedRentalAsset integration', () => {
  let testApp: E2ETestApp;
  let prisma: PrismaService;
  let commandBus: CommandBus;
  let core: TestFixtures;
  let fixtures: EditConfirmedRentalFixtures;
  let rentalFixtures: ConfirmRentalFixtures;

  beforeAll(async () => {
    testApp = await createE2ETestApp();
    prisma = testApp.app.get(PrismaService);
    commandBus = testApp.app.get(CommandBus);
    core = createTestFixtures(prisma);
    fixtures = new EditConfirmedRentalFixtures(prisma);
    rentalFixtures = new ConfirmRentalFixtures(prisma);
  });

  afterAll(async () => testApp?.close());

  async function scenario(options: { status?: V2RentalStatus; quantity?: number } = {}) {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const { user } = await core.createTenantUser({ tenantId: tenant.id });
    const commercial = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id });
    const rental = await fixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period: between(10, 12),
      offerId: commercial.offer.id,
      equipmentTypeId: commercial.equipmentType.id,
      quantity: options.quantity,
    });
    if (options.status && options.status !== 'CONFIRMED') {
      await prisma.client.v2Rental.update({ where: { id: rental.rentalId }, data: { status: options.status } });
    }
    return { tenant, branch, customer, user, commercial, rental };
  }

  async function candidate(setup: Awaited<ReturnType<typeof scenario>>, overrides: Record<string, unknown> = {}) {
    return fixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.commercial.equipmentType.id,
      overrides,
    });
  }

  async function version(rentalId: string) {
    return (await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rentalId } })).version;
  }

  function replaceCommand(params: {
    setup: Awaited<ReturnType<typeof scenario>>;
    replacementAssetId: string;
    currentAssetId?: string;
    expectedVersion: number;
  }) {
    return new ReplaceConfirmedRentalAssetCommand({
      tenantId: params.setup.tenant.id,
      tenantUserId: params.setup.user.id,
      rentalId: params.setup.rental.rentalId,
      expectedVersion: params.expectedVersion,
      currentAssignedAssetId: (params.currentAssetId ?? params.setup.rental.assetIds[0]) as never,
      replacementAssetId: params.replacementAssetId as never,
    });
  }

  async function replace(params: Parameters<typeof replaceCommand>[0]): Promise<ReplaceConfirmedRentalAssetResult> {
    return commandBus.execute(replaceCommand(params));
  }

  function activeEquipmentBlocks(state: Awaited<ReturnType<EditConfirmedRentalFixtures['persistedState']>>) {
    return state.blocks.filter((block) => block.blockType === 'EQUIPMENT' && block.releasedAt === null);
  }

  it('allows exactly one same-version cancellation or asset replacement without mixed blocks', async () => {
    const setup = await scenario();
    const replacementAssetId = await candidate(setup);
    const expectedVersion = await version(setup.rental.rentalId);
    const repository = testApp.app.get(RentalRepository);
    const originalFindById = repository.findById.bind(repository);
    const loaded = createBarrier(2);
    const findSpy = jest.spyOn(repository, 'findById').mockImplementation(async (tenantId, rentalId, tx) => {
      const rental = await originalFindById(tenantId, rentalId, tx);
      if (rentalId === setup.rental.rentalId && !tx) await loaded.wait();
      return rental;
    });

    try {
      const outcomes = await runConcurrently<CancelRentalResult | ReplaceConfirmedRentalAssetResult>([
        () => commandBus.execute(new CancelRentalCommand(setup.tenant.id, setup.rental.rentalId)),
        () => replace({ setup, replacementAssetId, expectedVersion }),
      ]);
      expect(outcomes.every((outcome) => outcome.status === 'fulfilled')).toBe(true);
      const results = outcomes.map(
        (outcome) => (outcome as PromiseFulfilledResult<CancelRentalResult | ReplaceConfirmedRentalAssetResult>).value,
      );
      expect(results.filter((result) => result.isOk())).toHaveLength(1);
      expect(
        results.filter((result) => result.isErr() && result.error.code === 'rental_commitment.rental_version_conflict'),
      ).toHaveLength(1);
    } finally {
      findSpy.mockRestore();
    }

    const state = await fixtures.persistedState(setup.rental.rentalId);
    const activeBlocks = activeEquipmentBlocks(state);
    if (state.rental.status === 'CANCELLED') {
      expect(activeBlocks).toHaveLength(0);
      expect(state.rental.assignedAssets[0].assetId).toBe(setup.rental.assetIds[0]);
    } else {
      expect(state.rental.status).toBe('CONFIRMED');
      expect(state.rental.assignedAssets).toEqual([expect.objectContaining({ assetId: replacementAssetId })]);
      expect(activeBlocks).toEqual([expect.objectContaining({ assetId: replacementAssetId })]);
    }
  });

  it('atomically replaces X with compatible free Y while preserving commercial truth', async () => {
    const setup = await scenario();
    const replacementAssetId = await candidate(setup);
    const before = await fixtures.persistedState(setup.rental.rentalId);

    expect((await replace({ setup, replacementAssetId, expectedVersion: before.rental.version })).isOk()).toBe(true);

    const after = await fixtures.persistedState(setup.rental.rentalId);
    expect(after.rental.status).toBe('CONFIRMED');
    expect(after.rental.assignedAssets).toEqual([
      expect.objectContaining({ rentalDemandLineId: before.rental.demandLines[0].id, assetId: replacementAssetId }),
    ]);
    expect(activeEquipmentBlocks(after)).toEqual([
      expect.objectContaining({ assetId: replacementAssetId, releasedAt: null }),
    ]);
    expect(activeEquipmentBlocks(after)[0].period).toContain('2030-01-01 10:00:00+00');
    expect(activeEquipmentBlocks(after)[0].period).toContain('2030-01-01 12:00:00+00');
    expect(after.blocks.some((block) => block.assetId === setup.rental.assetIds[0] && block.releasedAt === null)).toBe(
      false,
    );
    expect(after.rental.priceSnapshot).toEqual(before.rental.priceSnapshot);
    expect(commercialRows(after.rental.selections)).toEqual(commercialRows(before.rental.selections));
    expect(commercialRows(after.rental.demandLines)).toEqual(commercialRows(before.rental.demandLines));
    expect(after.rental.periodStart).toEqual(before.rental.periodStart);
    expect(after.rental.periodEnd).toEqual(before.rental.periodEnd);
    expect(after.rental.branchId).toBe(before.rental.branchId);
    expect(after.rental.customerId).toBe(before.rental.customerId);
    expect(after.rental.ownerSplits).toEqual([]);
  });

  it.each([
    ['wrong equipment type', { equipmentTypeId: 'different-equipment-type' }],
    ['inactive candidate', { isActive: false }],
    ['non-rentable candidate', { isRentable: false }],
    ['inactive asset status', { assetStatus: 'INACTIVE' }],
    ['retired asset status', { assetStatus: 'RETIRED' }],
    ['inactive equipment type', { equipmentTypeIsActive: false }],
    ['wrong branch', { branchId: 'different-branch' }],
    [
      'third-party candidate without owner contract snapshot',
      { ownershipKind: 'THIRD_PARTY', ownerId: 'owner', ownerContractSnapshot: null },
    ],
  ])('enforces the V2RentalAssetCandidate projection policy: %s', async (_name, overrides) => {
    const setup = await scenario();
    const replacementAssetId = await candidate(setup, overrides);
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const result = await replace({ setup, replacementAssetId, expectedVersion: before.rental.version });
    expect(result.isErr() && result.error.code).toBe('rental_commitment.replacement_asset_unavailable');
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it('enforces tenant isolation through the V2RentalAssetCandidate projection', async () => {
    const setupA = await scenario();
    const setupB = await scenario();
    const foreignAssetId = await candidate(setupB);
    const beforeA = await fixtures.persistedState(setupA.rental.rentalId);
    const beforeB = await fixtures.persistedState(setupB.rental.rentalId);
    const result = await replace({
      setup: setupA,
      replacementAssetId: foreignAssetId,
      expectedVersion: beforeA.rental.version,
    });
    expect(result.isErr()).toBe(true);
    expect(await fixtures.persistedState(setupA.rental.rentalId)).toEqual(beforeA);
    expect(await fixtures.persistedState(setupB.rental.rentalId)).toEqual(beforeB);
  });

  it.each([
    ['left adjacency', between(8, 10), true],
    ['right adjacency', between(12, 14), true],
    ['overlaps start', between(9, 11), false],
    ['overlaps end', between(11, 13), false],
    [
      'ends one millisecond after start',
      { start: utcDate(2030, 1, 1, 8), end: oneMillisecondAfter(utcDate(2030, 1, 1, 10)) },
      false,
    ],
  ])('uses half-open candidate availability when a block %s', async (_name, blockedPeriod, succeeds) => {
    const setup = await scenario();
    const replacementAssetId = await candidate(setup);
    const competing = await rentalFixtures.createRental({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      customerId: setup.customer.id,
      period: blockedPeriod,
      status: 'CONFIRMED',
    });
    await fixtures.createActiveBlock({
      tenantId: setup.tenant.id,
      rentalId: competing.rentalId,
      assetId: replacementAssetId,
      period: blockedPeriod,
    });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const result = await replace({ setup, replacementAssetId, expectedVersion: before.rental.version });
    expect(result.isOk()).toBe(succeeds);
    if (!succeeds) expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it('ignores an overlapping released block on the replacement candidate', async () => {
    const setup = await scenario();
    const replacementAssetId = await candidate(setup);
    const cancelled = await rentalFixtures.createRental({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      customerId: setup.customer.id,
      period: between(10, 12),
      status: 'CANCELLED',
    });
    await fixtures.createActiveBlock({
      tenantId: setup.tenant.id,
      rentalId: cancelled.rentalId,
      assetId: replacementAssetId,
      period: between(10, 12),
      releasedAt: utcDate(2029, 12, 1),
    });
    expect(
      (await replace({ setup, replacementAssetId, expectedVersion: await version(setup.rental.rentalId) })).isOk(),
    ).toBe(true);
  });

  it('keeps the rental unchanged when asked to replace X with X', async () => {
    const setup = await scenario();
    const before = await fixtures.persistedState(setup.rental.rentalId);
    expect(
      (
        await replace({
          setup,
          replacementAssetId: setup.rental.assetIds[0],
          expectedVersion: before.rental.version,
        })
      ).isErr(),
    ).toBe(true);
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it('does not use one physical asset for two units in the same rental', async () => {
    const setup = await scenario({ quantity: 2 });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const result = await replace({
      setup,
      currentAssetId: setup.rental.assetIds[0],
      replacementAssetId: setup.rental.assetIds[1],
      expectedVersion: before.rental.version,
    });
    expect(result.isErr()).toBe(true);
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it.each(['CANCELLED'] as const)('rejects lifecycle status %s without mutation', async (status) => {
    const setup = await scenario({ status });
    const replacementAssetId = await candidate(setup);
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const result = await replace({ setup, replacementAssetId, expectedVersion: before.rental.version });
    expect(result.isErr() && result.error.code).toBe('rental_commitment.rental_cannot_be_edited_from_status');
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it.each(['GENERATED', 'SIGNING_REQUESTED', 'SIGNED'] as V2ContractStatus[])(
    'rejects contract status %s without mutation',
    async (status) => {
      const setup = await scenario();
      const replacementAssetId = await candidate(setup);
      await prisma.client.v2Contract.create({
        data: { tenantId: setup.tenant.id, rentalId: setup.rental.rentalId, status },
      });
      const before = await fixtures.persistedState(setup.rental.rentalId);
      const result = await replace({ setup, replacementAssetId, expectedVersion: before.rental.version });
      expect(result.isErr() && result.error.code).toBe('rental_commitment.rental_contract_prevents_editing');
      expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
    },
  );

  it('preserves complete state on a stale expectedVersion retry', async () => {
    const setup = await scenario();
    const replacementAssetId = await candidate(setup);
    const stale = await version(setup.rental.rentalId);
    await prisma.client.v2Rental.update({
      where: { id: setup.rental.rentalId },
      data: { notes: 'concurrent change', version: { increment: 1 } },
    });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const result = await replace({ setup, replacementAssetId, expectedVersion: stale });
    expect(result.isErr() && result.error.code).toBe('rental_commitment.rental_version_conflict');
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it.each([
    ['tenant to third party', 'TENANT_OWNED', 'owner-y'],
    ['third party to tenant', 'THIRD_PARTY', null],
    ['third-party owner A to owner B', 'THIRD_PARTY', 'owner-b'],
  ] as const)(
    'recalculates owner splits from unchanged accepted pricing: %s',
    async (_name, initialKind, replacementOwner) => {
      const setup = await scenario();
      const initialAssignment = (await fixtures.persistedState(setup.rental.rentalId)).rental.assignedAssets[0];
      if (initialKind === 'THIRD_PARTY') {
        await prisma.client.v2RentalOwnerSplit.create({
          data: {
            tenantId: setup.tenant.id,
            rentalId: setup.rental.rentalId,
            rentalSelectionId: setup.rental.selectionIds[0],
            rentalDemandLineId: setup.rental.demandLineIds[0],
            assignedAssetId: initialAssignment.id,
            assetId: initialAssignment.assetId,
            ownerId: 'owner-a',
            contractId: 'contract-a',
            basis: 'NET',
            ownerShare: '0.25',
            basisAmount: '100.00',
            ownerAmount: '25.00',
            currency: 'USD',
          },
        });
      }
      const replacementAssetId = await candidate(
        setup,
        replacementOwner
          ? {
              ownershipKind: 'THIRD_PARTY',
              ownerId: replacementOwner,
              ownerContractSnapshot: ownerSnapshot(replacementOwner, `contract-${replacementOwner}`, '0.40'),
            }
          : {},
      );
      const before = await fixtures.persistedState(setup.rental.rentalId);
      expect((await replace({ setup, replacementAssetId, expectedVersion: before.rental.version })).isOk()).toBe(true);
      const after = await fixtures.persistedState(setup.rental.rentalId);
      expect(after.rental.priceSnapshot).toEqual(before.rental.priceSnapshot);
      expect(commercialRows(after.rental.selections)).toEqual(commercialRows(before.rental.selections));
      expect(commercialRows(after.rental.demandLines)).toEqual(commercialRows(before.rental.demandLines));
      if (!replacementOwner) expect(after.rental.ownerSplits).toEqual([]);
      else {
        expect(after.rental.ownerSplits).toEqual([
          expect.objectContaining({
            assetId: replacementAssetId,
            ownerId: replacementOwner,
            contractId: `contract-${replacementOwner}`,
            ownerShare: new Prisma.Decimal('0.40'),
            basisAmount: new Prisma.Decimal('100.00'),
            ownerAmount: new Prisma.Decimal('40.00'),
          }),
        ]);
      }
    },
  );

  it('allows at most one of two overlapping rentals to replace toward Y and leaves the loser original', async () => {
    const first = await scenario();
    const secondRental = await fixtures.createConfirmedRental({
      tenantId: first.tenant.id,
      branchId: first.branch.id,
      customerId: first.customer.id,
      period: between(10, 12),
      offerId: first.commercial.offer.id,
      equipmentTypeId: first.commercial.equipmentType.id,
    });
    const replacementAssetId = await candidate(first);
    const firstBefore = await fixtures.persistedState(first.rental.rentalId);
    const secondBefore = await fixtures.persistedState(secondRental.rentalId);
    const secondSetup = { ...first, rental: secondRental };
    const outcomes = await runConcurrently([
      () => replace({ setup: first, replacementAssetId, expectedVersion: firstBefore.rental.version }),
      () => replace({ setup: secondSetup, replacementAssetId, expectedVersion: secondBefore.rental.version }),
    ]);
    const results = outcomes.map(
      (outcome) => (outcome as PromiseFulfilledResult<ReplaceConfirmedRentalAssetResult>).value,
    );
    expect(results.filter((result) => result.isOk())).toHaveLength(1);
    const states = await Promise.all([
      fixtures.persistedState(first.rental.rentalId),
      fixtures.persistedState(secondRental.rentalId),
    ]);
    expect(
      states.flatMap((state) => activeEquipmentBlocks(state)).filter((block) => block.assetId === replacementAssetId),
    ).toHaveLength(1);
    expect(states.filter((state) => state.rental.assignedAssets[0].assetId === replacementAssetId)).toHaveLength(1);
    const loserIndex = states.findIndex((state) => state.rental.assignedAssets[0].assetId !== replacementAssetId);
    expect(states[loserIndex]).toEqual([firstBefore, secondBefore][loserIndex]);
  });

  it('keeps replacement and confirmation mutually coherent when both compete for Y', async () => {
    const target = await scenario();
    const replacementAssetId = await candidate(target);
    const draft = await rentalFixtures.createRental({
      tenantId: target.tenant.id,
      branchId: target.branch.id,
      customerId: target.customer.id,
      period: between(10, 12),
      demands: [{ equipmentTypeId: target.commercial.equipmentType.id }],
    });
    const before = await fixtures.persistedState(target.rental.rentalId);
    await runConcurrently([
      () => replace({ setup: target, replacementAssetId, expectedVersion: before.rental.version }),
      () =>
        commandBus.execute<ConfirmRentalCommand, ConfirmRentalResult>(
          new ConfirmRentalCommand(target.tenant.id, draft.rentalId),
        ),
    ]);
    const targetAfter = await fixtures.persistedState(target.rental.rentalId);
    const draftAfter = await fixtures.persistedState(draft.rentalId);
    const yBlocks = [targetAfter, draftAfter]
      .flatMap((state) => activeEquipmentBlocks(state))
      .filter((block) => block.assetId === replacementAssetId);
    expect(yBlocks).toHaveLength(1);
    expect(
      targetAfter.rental.assignedAssets[0].assetId === replacementAssetId ||
        targetAfter.rental.assignedAssets[0].assetId === target.rental.assetIds[0],
    ).toBe(true);
    expect(['DRAFT', 'CONFIRMED']).toContain(draftAfter.rental.status);
    if (draftAfter.rental.status === 'DRAFT') {
      expect(draftAfter.rental.assignedAssets).toHaveLength(0);
      expect(activeEquipmentBlocks(draftAfter)).toHaveLength(0);
    }
  });

  it('allows exactly one same-version replacement and persists one complete request', async () => {
    const setup = await scenario();
    const [y, z] = await Promise.all([candidate(setup), candidate(setup)]);
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const outcomes = await runConcurrently([
      () => replace({ setup, replacementAssetId: y, expectedVersion: before.rental.version }),
      () => replace({ setup, replacementAssetId: z, expectedVersion: before.rental.version }),
    ]);
    const results = outcomes.map(
      (outcome) => (outcome as PromiseFulfilledResult<ReplaceConfirmedRentalAssetResult>).value,
    );
    expect(results.filter((result) => result.isOk())).toHaveLength(1);
    expect(
      results.filter((result) => result.isErr() && result.error.code === 'rental_commitment.rental_version_conflict'),
    ).toHaveLength(1);
    const after = await fixtures.persistedState(setup.rental.rentalId);
    expect([y, z]).toContain(after.rental.assignedAssets[0].assetId);
    expect(activeEquipmentBlocks(after)).toEqual([
      expect.objectContaining({ assetId: after.rental.assignedAssets[0].assetId }),
    ]);
  });

  it('serializes replacement against a same-version confirmed-rental edit without mixed children', async () => {
    const setup = await scenario();
    const replacementAssetId = await candidate(setup);
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const editCommand = new EditConfirmedRentalCommand({
      tenantId: setup.tenant.id,
      tenantUserId: setup.user.id,
      rentalId: setup.rental.rentalId,
      expectedVersion: before.rental.version,
      branchId: setup.branch.id,
      period: new RentalPeriod(before.rental.periodStart, before.rental.periodEnd),
      selectedOffers: [{ rentalOfferId: setup.commercial.offer.id, quantity: 1 }],
      fulfillmentMethod: 'PICKUP',
      notes: 'concurrent edit won',
      insuranceSelected: before.rental.insuranceSelected,
      manualPricingAdjustment: null,
    });
    const outcomes = await runConcurrently([
      () => replace({ setup, replacementAssetId, expectedVersion: before.rental.version }),
      () => commandBus.execute<EditConfirmedRentalCommand, EditConfirmedRentalResult>(editCommand),
    ]);
    const results = outcomes.map(
      (outcome) =>
        (outcome as PromiseFulfilledResult<ReplaceConfirmedRentalAssetResult | EditConfirmedRentalResult>).value,
    );
    expect(results.filter((result) => result.isOk())).toHaveLength(1);
    expect(
      results.filter((result) => result.isErr() && result.error.code === 'rental_commitment.rental_version_conflict'),
    ).toHaveLength(1);
    const after = await fixtures.persistedState(setup.rental.rentalId);
    const replacementWon = after.rental.assignedAssets[0].assetId === replacementAssetId;
    expect(after.rental.notes).toBe(replacementWon ? before.rental.notes : 'concurrent edit won');
    expect(activeEquipmentBlocks(after)).toEqual([
      expect.objectContaining({ assetId: after.rental.assignedAssets[0].assetId }),
    ]);
    expect(after.rental.demandLines).toHaveLength(1);
    expect(after.rental.assignedAssets).toHaveLength(1);
  });
});

function between(startHour: number, endHour: number) {
  return { start: utcDate(2030, 1, 1, startHour), end: utcDate(2030, 1, 1, endHour) };
}

function ownerSnapshot(ownerId: string, contractId: string, ownerShare: string): Prisma.InputJsonValue {
  return { ownerId, contractId, ownerShare, rentalShare: String(1 - Number(ownerShare)), basis: 'NET' };
}

function commercialRows<T extends { createdAt: Date }>(rows: T[]) {
  return rows.map(({ createdAt: _createdAt, ...row }) => row);
}
