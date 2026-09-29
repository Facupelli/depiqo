import { randomUUID } from 'node:crypto';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestingModule } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from 'src/core/database/prisma.service';
import { parsePostgresRange } from 'src/core/utils/postgres-range.util';
import {
  createRentalCommitmentIntegrationContext,
  useIntegrationTestContext,
} from '../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../test/support/fixtures';
import { utcDate } from '../../../../test/support/time';

import { RentalAssetAllocationService } from '../asset-allocation/rental-asset-allocation.service';
import { ConfirmRentalFixtures } from '../features/confirm-rental/testing/confirm-rental.fixtures';
import { ConfirmedRentalEditedIntegrationEvent } from '../public-api/events/rental-lifecycle.integration-events';
import { RentalAccessoryMutations } from './rental-accessory-mutations';

describe('RentalAccessoryMutations integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let core: TestFixtures;
  let fixtures: ConfirmRentalFixtures;
  let mutations: RentalAccessoryMutations;
  let emitter: EventEmitter2;

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    core = createTestFixtures(prisma);
    fixtures = new ConfirmRentalFixtures(prisma);
    mutations = moduleRef.get(RentalAccessoryMutations);
    emitter = moduleRef.get(EventEmitter2);
    return moduleRef;
  });

  async function scenario() {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const equipmentType = await prisma.client.v2EquipmentType.create({
      data: { tenantId: tenant.id, name: `Accessory ${randomUUID()}` },
    });
    const period = { start: utcDate(2030, 1, 1, 10), end: utcDate(2030, 1, 2, 10) };
    const rental = await fixtures.createRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      status: 'CONFIRMED',
      period,
      demands: [{}, {}],
    });
    await prisma.client.v2Rental.update({
      where: { id: rental.rentalId },
      data: { acceptedBeforeBufferMinutes: 10, acceptedAfterBufferMinutes: 15 },
    });
    const assetId = await fixtures.createCandidate({
      tenantId: tenant.id,
      branchId: branch.id,
      equipmentTypeId: equipmentType.id,
    });
    return { tenant, branch, customer, equipmentType, rental, assetId, period };
  }

  function wholeInput(s: Awaited<ReturnType<typeof scenario>>, expectedVersion = 0) {
    return {
      tenantId: s.tenant.id,
      rentalId: s.rental.rentalId,
      expectedVersion,
      accessories: [
        { sourceRentalDemandLineId: s.rental.demandLineIds[0], equipmentTypeId: s.equipmentType.id, quantity: 1 },
      ],
    };
  }

  async function state(rentalId: string) {
    const rental = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rentalId } });
    const selections = await prisma.client.v2RentalAccessorySelection.findMany({
      where: { rentalOrderId: rentalId },
      include: { assignments: true },
    });
    const blocks = await prisma.client.$queryRaw<Array<{ assetId: string; period: string }>>`
      SELECT asset_id AS "assetId", period::text AS period FROM v2_asset_blocks
      WHERE rental_id = ${rentalId} AND block_type = 'ACCESSORY' AND released_at IS NULL
    `;
    return { rental, selections, blocks };
  }

  it('replaces whole-rental accessories, preserves accepted names and assignments, and skips no-op writes/events', async () => {
    const s = await scenario();
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      const created = await mutations.replaceRentalAccessories(wholeInput(s));
      expect(created.isOk() && created.value).toMatchObject({ version: 1, changed: true });
      const first = await state(s.rental.rentalId);
      expect(first.selections).toHaveLength(1);
      expect(first.selections[0].equipmentTypeNameSnapshot).toBe(s.equipmentType.name);
      expect(first.selections[0].assignments.map(({ assetId }) => assetId)).toEqual([s.assetId]);
      expect(first.blocks).toHaveLength(1);
      expect(parsePostgresRange(first.blocks[0].period)).toEqual({
        start: utcDate(2030, 1, 1, 9, 50),
        end: utcDate(2030, 1, 2, 10, 15),
      });
      expect(events).toHaveLength(1);

      await prisma.client.v2EquipmentType.update({
        where: { id: s.equipmentType.id },
        data: { name: 'Renamed accessory' },
      });
      const unchanged = await mutations.replaceRentalAccessories(wholeInput(s, 1));
      expect(unchanged.isOk() && unchanged.value).toMatchObject({ version: 1, changed: false });
      expect(await state(s.rental.rentalId)).toEqual(first);
      expect(events).toHaveLength(1);

      const removed = await mutations.replaceRentalAccessories({ ...wholeInput(s, 1), accessories: [] });
      expect(removed.isOk() && removed.value).toMatchObject({ version: 2, changed: true });
      const after = await state(s.rental.rentalId);
      expect(after.selections).toHaveLength(0);
      expect(after.blocks).toHaveLength(0);
      expect(events).toHaveLength(2);
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }
  });

  it('rejects stale versions, including no-op requests, without changing state', async () => {
    const s = await scenario();
    expect((await mutations.replaceRentalAccessories(wholeInput(s))).isOk()).toBe(true);
    const before = await state(s.rental.rentalId);
    const stale = await mutations.replaceRentalAccessories(wholeInput(s));
    expect(stale.isErr() && stale.error.code).toBe('RentalVersionConflict');
    expect(await state(s.rental.rentalId)).toEqual(before);
  });

  it('serializes same-version edits and commits only one complete assignment', async () => {
    const s = await scenario();
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      const [first, second] = await Promise.all([
        mutations.replaceRentalAccessories(wholeInput(s)),
        mutations.replaceDemandLineAccessories({
          tenantId: s.tenant.id,
          rentalId: s.rental.rentalId,
          rentalDemandLineId: s.rental.demandLineIds[1],
          expectedVersion: 0,
          accessories: [{ equipmentTypeId: s.equipmentType.id, quantity: 1 }],
        }),
      ]);
      expect([first, second].filter((result) => result.isOk())).toHaveLength(1);
      expect(
        [first, second].filter((result) => result.isErr()).map((result) => result.isErr() && result.error.code),
      ).toEqual(['RentalVersionConflict']);
      const after = await state(s.rental.rentalId);
      expect(after.rental.version).toBe(1);
      expect(after.selections).toHaveLength(1);
      expect(after.selections[0].assignments).toHaveLength(1);
      expect(after.blocks).toHaveLength(1);
      expect(events).toHaveLength(1);
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }
  });

  it('rolls back the version and assignments if an overlapping block wins after planning', async () => {
    const s = await scenario();
    const blockingRental = await fixtures.createRental({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      period: s.period,
    });
    const allocation = moduleRef.get(RentalAssetAllocationService);
    const originalPlan = allocation.planAllocations.bind(allocation);
    const spy = vi.spyOn(allocation, 'planAllocations').mockImplementation(async (input) => {
      const result = await originalPlan(input);
      if (result.isOk()) {
        await fixtures.createActiveBlock({
          tenantId: s.tenant.id,
          rentalId: blockingRental.rentalId,
          assetId: s.assetId,
          period: s.period,
          blockType: 'ACCESSORY',
        });
      }
      return result;
    });
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      const result = await mutations.replaceRentalAccessories(wholeInput(s));
      expect(result.isErr() && result.error.code).toBe('AssetAvailabilityChanged');
      const after = await state(s.rental.rentalId);
      expect(after.rental.version).toBe(0);
      expect(after.selections).toHaveLength(0);
      expect(after.blocks).toHaveLength(0);
      expect(events).toHaveLength(0);
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
      spy.mockRestore();
    }
  });

  it('rejects non-confirmed or ended rentals even when no accessories are requested', async () => {
    const s = await scenario();
    await prisma.client.v2Rental.update({ where: { id: s.rental.rentalId }, data: { status: 'PENDING' } });
    const pending = await mutations.replaceRentalAccessories({ ...wholeInput(s), accessories: [] });
    expect(pending.isErr() && pending.error.code).toBe('RentalStatusDoesNotAllowAccessoryAssignment');
    await prisma.client.v2Rental.update({
      where: { id: s.rental.rentalId },
      data: { status: 'CONFIRMED', periodEnd: utcDate(2020, 1, 2, 10) },
    });
    const ended = await mutations.replaceRentalAccessories({ ...wholeInput(s), accessories: [] });
    expect(ended.isErr() && ended.error.code).toBe('RentalStatusDoesNotAllowAccessoryAssignment');
    expect((await state(s.rental.rentalId)).rental.version).toBe(0);
  });

  it('replaces only one demand line while retaining protected assignments and existing snapshots', async () => {
    const s = await scenario();
    const original = await mutations.replaceRentalAccessories(wholeInput(s));
    expect(original.isOk()).toBe(true);
    const first = await state(s.rental.rentalId);
    const protectedAssetId = first.selections[0].assignments[0].assetId;
    const second = await mutations.replaceDemandLineAccessories({
      tenantId: s.tenant.id,
      rentalId: s.rental.rentalId,
      rentalDemandLineId: s.rental.demandLineIds[1],
      expectedVersion: 1,
      accessories: [{ equipmentTypeId: s.equipmentType.id, quantity: 1 }],
    });
    expect(second.isErr() && second.error.code).toBe('InsufficientAssetAvailability');
    expect(second.isErr() && second.error.availability).toMatchObject({
      sourceRentalDemandLineId: s.rental.demandLineIds[1],
      requestedQuantity: 1,
      availableQuantity: 0,
    });
    expect(await state(s.rental.rentalId)).toEqual(first);

    const secondAssetId = await fixtures.createCandidate({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      equipmentTypeId: s.equipmentType.id,
    });
    expect(
      (
        await mutations.replaceDemandLineAccessories({
          tenantId: s.tenant.id,
          rentalId: s.rental.rentalId,
          rentalDemandLineId: s.rental.demandLineIds[1],
          expectedVersion: 1,
          accessories: [{ equipmentTypeId: s.equipmentType.id, quantity: 1 }],
        })
      ).isOk(),
    ).toBe(true);
    const after = await state(s.rental.rentalId);
    expect(after.selections).toHaveLength(2);
    expect(
      after.selections.find(({ sourceRentalDemandLineId }) => sourceRentalDemandLineId === s.rental.demandLineIds[0])
        ?.assignments[0].assetId,
    ).toBe(protectedAssetId);
    expect(
      after.selections.find(({ sourceRentalDemandLineId }) => sourceRentalDemandLineId === s.rental.demandLineIds[1])
        ?.assignments[0].assetId,
    ).toBe(secondAssetId);
    expect(after.blocks).toHaveLength(2);
    expect(after.rental.version).toBe(2);

    await prisma.client.v2EquipmentType.delete({ where: { id: s.equipmentType.id } });
    const unchanged = await mutations.replaceDemandLineAccessories({
      tenantId: s.tenant.id,
      rentalId: s.rental.rentalId,
      rentalDemandLineId: s.rental.demandLineIds[1],
      expectedVersion: 2,
      accessories: [{ equipmentTypeId: s.equipmentType.id, quantity: 1 }],
    });
    expect(unchanged.isOk() && unchanged.value.changed).toBe(false);
    expect(
      (await state(s.rental.rentalId)).selections.find(
        ({ sourceRentalDemandLineId }) => sourceRentalDemandLineId === s.rental.demandLineIds[1],
      )?.equipmentTypeNameSnapshot,
    ).toBe(s.equipmentType.name);
  });

  it('validates an empty demand-line replacement target and does not affect other selections', async () => {
    const s = await scenario();
    expect((await mutations.replaceRentalAccessories(wholeInput(s))).isOk()).toBe(true);
    const first = await state(s.rental.rentalId);
    const missing = await mutations.replaceDemandLineAccessories({
      tenantId: s.tenant.id,
      rentalId: s.rental.rentalId,
      rentalDemandLineId: randomUUID(),
      expectedVersion: 1,
      accessories: [],
    });
    expect(missing.isErr() && missing.error.code).toBe('SourceRentalDemandLineNotFound');
    expect(await state(s.rental.rentalId)).toEqual(first);
  });

  it('rejects duplicate selections and unknown equipment types atomically', async () => {
    const s = await scenario();
    const duplicates = await mutations.replaceRentalAccessories({
      ...wholeInput(s),
      accessories: [wholeInput(s).accessories[0], wholeInput(s).accessories[0]],
    });
    expect(duplicates.isErr() && duplicates.error.code).toBe('DuplicateAccessorySelection');
    const missing = await mutations.replaceRentalAccessories({
      ...wholeInput(s),
      accessories: [{ equipmentTypeId: randomUUID(), quantity: 1 }],
    });
    expect(missing.isErr() && missing.error.code).toBe('EquipmentTypeNotFound');
    expect((await state(s.rental.rentalId)).rental.version).toBe(0);
  });
});
