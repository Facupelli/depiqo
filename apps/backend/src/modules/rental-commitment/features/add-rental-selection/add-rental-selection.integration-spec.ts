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
import { utcDate } from '../../../../../test/support/time';
import { EditConfirmedRentalFixtures } from '../edit-confirmed-rental/testing/edit-confirmed-rental.fixtures';
import { AddRentalSelectionCommand } from './add-rental-selection.command';
import { AddRentalSelectionResult } from './add-rental-selection.handler';

describe('AddRentalSelection integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let commandBus: CommandBus;
  let emitter: EventEmitter2;
  let core: TestFixtures;
  let fixtures: EditConfirmedRentalFixtures;

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    commandBus = moduleRef.get(CommandBus);
    emitter = moduleRef.get(EventEmitter2);
    core = createTestFixtures(prisma);
    fixtures = new EditConfirmedRentalFixtures(prisma);
    return moduleRef;
  });

  async function scenario(period: { start: Date; end: Date }) {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const { user } = await core.createTenantUser({ tenantId: tenant.id });
    const camera = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id, pricePerDay: '100.00' });
    const light = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id, pricePerDay: '40.00' });
    const rental = await fixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period,
      offerId: camera.offer.id,
      equipmentTypeId: camera.equipmentType.id,
    });
    return { tenant, branch, customer, user, camera, light, rental };
  }

  async function add(
    setup: Awaited<ReturnType<typeof scenario>>,
    overrides: Partial<AddRentalSelectionCommand['props']> = {},
  ): Promise<AddRentalSelectionResult> {
    const persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    return commandBus.execute(
      new AddRentalSelectionCommand({
        tenantId: setup.tenant.id,
        tenantUserId: setup.user.id,
        rentalId: setup.rental.rentalId,
        expectedVersion: persisted.version,
        rentalOfferId: setup.light.offer.id,
        quantity: 1,
        ...overrides,
      }),
    );
  }

  it('adds during the rental without replanning existing facts and reprices the complete commercial rental', async () => {
    const now = Date.now();
    const setup = await scenario({ start: new Date(now - 4 * 60 * 60_000), end: new Date(now + 4 * 60 * 60_000) });
    const ownerId = 'light-owner';
    const lightAssetId = await fixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.light.equipmentType.id,
      overrides: {
        ownershipKind: 'THIRD_PARTY',
        ownerId,
        ownerContractSnapshot: {
          ownerId,
          contractId: 'light-contract',
          ownerShare: 0.4,
          rentalShare: 0.6,
          basis: 'NET',
        },
      },
    });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const oldSnapshot = before.rental.priceSnapshot as Record<string, unknown>;
    await prisma.client.v2Rental.update({
      where: { id: setup.rental.rentalId },
      data: {
        priceSnapshot: {
          ...oldSnapshot,
          manualPricingAdjustment: {
            mode: 'TARGET_TOTAL',
            targetTotal: '80.00',
            previousTotal: '100.00',
            direction: 'DECREASE',
            adjustmentTotal: '20.00',
            setByTenantUserId: setup.user.id,
            setAtIso: new Date().toISOString(),
          },
        },
      },
    });

    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    const commandStartedAt = new Date();
    const result = await add(setup);
    const commandFinishedAt = new Date();
    emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    expect(result.isOk()).toBe(true);

    const after = await fixtures.persistedState(setup.rental.rentalId);
    expect(
      before.rental.selections.map((existing) => after.rental.selections.find(({ id }) => id === existing.id)),
    ).toEqual(before.rental.selections);
    expect(
      before.rental.demandLines.map((existing) => after.rental.demandLines.find(({ id }) => id === existing.id)),
    ).toEqual(before.rental.demandLines);
    expect(
      before.rental.assignedAssets.map((existing) => after.rental.assignedAssets.find(({ id }) => id === existing.id)),
    ).toEqual(before.rental.assignedAssets);
    expect(after.blocks.filter((block) => before.blocks.some((existing) => existing.id === block.id))).toEqual(
      before.blocks,
    );

    const lightSelection = after.rental.selections.find(
      (selection) => selection.rentalOfferId === setup.light.offer.id,
    )!;
    const lightDemand = after.rental.demandLines.find((line) => line.rentalSelectionId === lightSelection.id)!;
    const lightAssignment = after.rental.assignedAssets.find((assignment) => assignment.assetId === lightAssetId)!;
    const lightBlock = after.blocks.find((block) => block.assetId === lightAssetId)!;
    const blockPeriod = parsePostgresRange(lightBlock.period);
    expect(lightDemand.rentalSelectionId).toBe(lightSelection.id);
    expect(lightAssignment.rentalDemandLineId).toBe(lightDemand.id);
    expect(lightAssignment.effectiveFrom.getTime()).toBeGreaterThanOrEqual(commandStartedAt.getTime());
    expect(lightAssignment.effectiveFrom.getTime()).toBeLessThanOrEqual(commandFinishedAt.getTime());
    expect(lightAssignment.effectiveUntil).toBeNull();
    expect(blockPeriod.start).toEqual(lightAssignment.effectiveFrom);
    expect(blockPeriod.end).toEqual(after.rental.periodEnd);

    const priceSnapshot = after.rental.priceSnapshot as {
      final: { lines: Array<{ rentalSelectionId: string; chargedUnits: number }> };
      durationPolicySnapshot?: unknown;
      manualPricingAdjustment?: unknown;
    };
    expect(priceSnapshot.final.lines.map((line) => line.rentalSelectionId)).toEqual(
      expect.arrayContaining([before.rental.selections[0].id, lightSelection.id]),
    );
    expect(priceSnapshot.final.lines[0].chargedUnits).toBe(priceSnapshot.final.lines[1].chargedUnits);
    expect(priceSnapshot).not.toHaveProperty('manualPricingAdjustment');
    expect(after.rental.ownerSplits).toEqual([
      expect.objectContaining({
        rentalSelectionId: lightSelection.id,
        rentalDemandLineId: lightDemand.id,
        assignedAssetId: lightAssignment.id,
        assetId: lightAssetId,
        ownerId,
      }),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].occurredAt).toEqual(lightAssignment.effectiveFrom);
  });

  it('uses only the remaining interval when deciding availability', async () => {
    const now = Date.now();
    const setup = await scenario({ start: new Date(now - 2 * 60 * 60_000), end: new Date(now + 2 * 60 * 60_000) });
    const availableAfterStart = await fixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.light.equipmentType.id,
    });
    const conflictingAfterStart = await fixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.light.equipmentType.id,
    });
    const pastRental = await fixtures.createConfirmedRental({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      customerId: setup.customer.id,
      period: { start: new Date(now - 4 * 60 * 60_000), end: new Date(now - 60_000) },
      offerId: setup.light.offer.id,
      equipmentTypeId: setup.light.equipmentType.id,
      assetId: availableAfterStart,
    });
    const conflictingRental = await fixtures.createConfirmedRental({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      customerId: setup.customer.id,
      period: { start: new Date(now - 60_000), end: new Date(now + 60 * 60_000) },
      offerId: setup.light.offer.id,
      equipmentTypeId: setup.light.equipmentType.id,
      assetId: conflictingAfterStart,
    });

    expect((await add(setup)).isOk()).toBe(true);
    const state = await fixtures.persistedState(setup.rental.rentalId);
    const newAssetIds = state.rental.assignedAssets
      .map((assignment) => assignment.assetId)
      .filter((assetId) => !setup.rental.assetIds.includes(assetId));
    expect(newAssetIds).toEqual([availableAfterStart]);
    expect(newAssetIds).not.toContain(conflictingAfterStart);
    expect(pastRental.rentalId).not.toBe(conflictingRental.rentalId);
  });

  it('starts a pre-start assignment and block at the rental period start', async () => {
    const setup = await scenario({ start: utcDate(2030, 1, 1, 10), end: utcDate(2030, 1, 1, 18) });
    const lightAssetId = await fixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.light.equipmentType.id,
    });
    expect((await add(setup)).isOk()).toBe(true);
    const state = await fixtures.persistedState(setup.rental.rentalId);
    const assignment = state.rental.assignedAssets.find((candidate) => candidate.assetId === lightAssetId)!;
    const block = state.blocks.find((candidate) => candidate.assetId === lightAssetId)!;
    expect(assignment.effectiveFrom).toEqual(state.rental.periodStart);
    expect(parsePostgresRange(block.period).start).toEqual(state.rental.periodStart);
  });

  it.each([
    ['duplicate offer', 'rental_commitment.duplicate_rental_offer_selection'],
    ['ended period', 'rental_commitment.rental_period_ended'],
    ['insufficient availability', 'rental_commitment.insufficient_asset_availability'],
    ['stale version', 'rental_commitment.rental_version_conflict'],
  ])('preserves persisted state after %s', async (failure, expectedCode) => {
    const now = Date.now();
    const period =
      failure === 'ended period'
        ? { start: new Date(now - 2 * 60 * 60_000), end: new Date(now - 60_000) }
        : { start: new Date(now - 60 * 60_000), end: new Date(now + 60 * 60_000) };
    const setup = await scenario(period);
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const overrides =
      failure === 'duplicate offer'
        ? { rentalOfferId: setup.camera.offer.id }
        : failure === 'stale version'
          ? { expectedVersion: before.rental.version + 1 }
          : {};
    const result = await add(setup, overrides);
    expect(result.isErr() && result.error.code).toBe(expectedCode);
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });
});
