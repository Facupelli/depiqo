import { describe, expect, it, vi } from 'vitest';
import { CommandBus } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestingModule } from '@nestjs/testing';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import {
  createRentalCommitmentIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { ConfirmedRentalReschedulingPreparationService } from '../../application/confirmed-rental-rescheduling-preparation.service';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import { RentalPersistenceStateMismatchError, RentalRepository } from '../../persistence/rental.repository';
import { ConfirmedRentalEditedIntegrationEvent } from '../../public-api/events/rental-lifecycle.integration-events';
import { ConfirmedRentalFixtures } from '../../testing/confirmed-rental.fixtures';
import {
  AcceptedDeliverySnapshot,
  AcceptedDeliverySnapshotData,
} from '../../domain/value-objects/accepted-delivery-snapshot.value-object';
import {
  AssetUnavailabilityResult,
  ScheduleAssetUnavailabilityCommand,
} from '../manage-asset-unavailability/asset-unavailability.handler';
import { RescheduleConfirmedRentalPeriodCommand } from './reschedule-confirmed-rental-period.command';
import { RescheduleConfirmedRentalPeriodResult } from './reschedule-confirmed-rental-period.handler';
import { RescheduleConfirmedRentalPeriodApplicationInputSchema } from './reschedule-confirmed-rental-period.request.dto';

function readAcceptedDeliverySnapshot(value: Prisma.JsonValue | null): AcceptedDeliverySnapshotData {
  if (value === null) {
    throw new Error('Expected a persisted delivery snapshot.');
  }

  const parsed = AcceptedDeliverySnapshot.create(value);
  if (parsed.isErr()) {
    throw parsed.error;
  }

  return parsed.value.snapshot;
}

describe('RescheduleConfirmedRentalPeriod integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let bus: CommandBus;
  let core: TestFixtures;
  let fixtures: ConfirmedRentalFixtures;

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    bus = moduleRef.get(CommandBus);
    core = createTestFixtures(prisma);
    fixtures = new ConfirmedRentalFixtures(prisma);
    return moduleRef;
  });

  async function scenario(
    options: { delivery?: 'ROUTED' | 'STAFF_ARRANGED'; startHours?: number; endHours?: number } = {},
  ) {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const { user } = await core.createTenantUser({ tenantId: tenant.id });
    const commercial = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id });
    const now = Date.now();
    const period = {
      start: new Date(now + (options.startHours ?? 48) * 3_600_000),
      end: new Date(now + (options.endHours ?? 72) * 3_600_000),
    };
    const rental = await fixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period,
      offerId: commercial.offer.id,
      equipmentTypeId: commercial.equipmentType.id,
      acceptedAssetBuffer: { beforeBufferMinutes: 30, afterBufferMinutes: 60 },
    });
    if (options.delivery) {
      await prisma.client.v2Rental.update({
        where: { id: rental.rentalId },
        data: {
          fulfillmentMethod: 'DELIVERY',
          acceptedCustomerTotal: '140.00',
          deliveryDetails: {
            create: {
              tenantId: tenant.id,
              address: 'Main Street 1',
              formattedAddress: 'Main Street 1, City',
              latitude: -34.6,
              longitude: -58.4,
            },
          },
          deliverySnapshot:
            options.delivery === 'STAFF_ARRANGED'
              ? {
                  schema: 'v2.accepted-delivery',
                  version: 2,
                  arrangement: 'STAFF_ARRANGED',
                  delivery: { scheduledAt: period.start.toISOString() },
                  collection: { scheduledAt: period.end.toISOString() },
                  currency: 'USD',
                  staffAgreement: { amount: '40.00', agreedBy: user.id, agreedAt: new Date().toISOString() },
                  transportReservationMinutes: 45,
                }
              : {
                  schema: 'v2.accepted-delivery',
                  version: 2,
                  arrangement: 'ROUTED',
                  distanceMeters: 12500,
                  delivery: {
                    scheduledAt: period.start.toISOString(),
                    serviceLevel: 'SPECIAL',
                    basePrice: '20.00',
                    surcharge: '5.00',
                    total: '25.00',
                  },
                  collection: {
                    scheduledAt: period.end.toISOString(),
                    serviceLevel: 'NORMAL',
                    basePrice: '15.00',
                    surcharge: '0.00',
                    total: '15.00',
                  },
                  currency: 'USD',
                  deliveryTotal: '40.00',
                  transportReservationMinutes: 45,
                },
        },
      });
      await prisma.client.$executeRaw`
        UPDATE v2_asset_blocks
        SET period = tstzrange(lower(period) - interval '45 minutes', upper(period) + interval '45 minutes', '[)')
        WHERE rental_id = ${rental.rentalId}
      `;
    }
    return { tenant, branch, user, customer, commercial, rental, period };
  }

  async function reschedule(
    setup: Awaited<ReturnType<typeof scenario>>,
    period: { start: Date; end: Date },
    expectedVersion?: number,
    deliveryDecisions?: RescheduleConfirmedRentalPeriodCommand['props']['deliveryDecisions'],
  ): Promise<RescheduleConfirmedRentalPeriodResult> {
    const current = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    return bus.execute(
      new RescheduleConfirmedRentalPeriodCommand({
        tenantId: setup.tenant.id,
        tenantUserId: setup.user.id,
        rentalId: setup.rental.rentalId,
        expectedVersion: expectedVersion ?? current.version,
        periodStart: period.start,
        periodEnd: period.end,
        deliveryDecisions,
      }),
    );
  }

  it.each([undefined, 'ROUTED', 'STAFF_ARRANGED'] as const)(
    'does not prepare, persist, or publish an unchanged %s period, including equivalent offsets',
    async (delivery) => {
      const setup = await scenario({ delivery });
      const before = await fixtures.persistedState(setup.rental.rentalId);
      const preparation = moduleRef.get(ConfirmedRentalReschedulingPreparationService);
      const prepare = vi.spyOn(preparation, 'prepare');
      const accept = vi.spyOn(preparation, 'accept');
      const persist = vi.spyOn(moduleRef.get(RentalRepository), 'rescheduleConfirmedPeriod');
      const allocate = vi.spyOn(moduleRef.get(RentalAssetAllocationService), 'findConflictingExactAssetIds');
      const transaction = vi.spyOn(moduleRef.get(PrismaUnitOfWork), 'runResultInTransaction');
      const events = vi.fn();
      const emitter = moduleRef.get(EventEmitter2);
      emitter.on(ConfirmedRentalEditedIntegrationEvent.name, events);
      try {
        const offset = (date: Date) => new Date(date.getTime() + 3_600_000).toISOString().replace('Z', '+01:00');
        const equivalent = RescheduleConfirmedRentalPeriodApplicationInputSchema.parse({
          expectedVersion: before.rental.version,
          period: { start: offset(setup.period.start), end: offset(setup.period.end) },
        });
        for (const period of [setup.period, equivalent.period]) {
          const result = await reschedule(setup, period, before.rental.version);
          expect(result._unsafeUnwrap()).toEqual({
            rentalId: setup.rental.rentalId,
            version: before.rental.version,
            updatedAt: before.rental.updatedAt,
          });
        }
        expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
        expect(prepare).not.toHaveBeenCalled();
        expect(accept).not.toHaveBeenCalled();
        expect(persist).not.toHaveBeenCalled();
        expect(allocate).not.toHaveBeenCalled();
        expect(transaction).not.toHaveBeenCalled();
        expect(events).not.toHaveBeenCalled();
      } finally {
        emitter.off(ConfirmedRentalEditedIntegrationEvent.name, events);
        prepare.mockRestore();
        accept.mockRestore();
        persist.mockRestore();
        allocate.mockRestore();
        transaction.mockRestore();
      }
    },
  );

  it.each([
    ['stale', 'rental_commitment.rental_version_conflict'],
    ['cancelled', 'rental_commitment.rental_cannot_be_edited_from_status'],
    ['started', 'rental_commitment.rental_period_has_started'],
  ] as const)('rejects an unchanged period for a %s rental without side effects', async (restriction, code) => {
    const setup = await scenario({ startHours: restriction === 'started' ? -1 : 48 });
    if (restriction === 'cancelled') {
      await prisma.client.v2Rental.update({ where: { id: setup.rental.rentalId }, data: { status: 'CANCELLED' } });
    }
    if (restriction === 'stale') {
      await prisma.client.v2Rental.update({
        where: { id: setup.rental.rentalId },
        data: { version: { increment: 1 } },
      });
    }
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const prepare = vi.spyOn(moduleRef.get(ConfirmedRentalReschedulingPreparationService), 'prepare');
    const events = vi.fn();
    const emitter = moduleRef.get(EventEmitter2);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, events);
    try {
      const result = await reschedule(setup, setup.period, before.rental.version - (restriction === 'stale' ? 1 : 0));
      expect(result._unsafeUnwrapErr().code).toBe(code);
      expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
      expect(prepare).not.toHaveBeenCalled();
      expect(events).not.toHaveBeenCalled();
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, events);
      prepare.mockRestore();
    }
  });

  it.each([
    ['later start', 60, 84],
    ['earlier future start', 24, 72],
    ['end-only change', 48, 96],
  ])('reschedules a PICKUP rental with a %s and preserves commercial and row identity', async (_name, start, end) => {
    const setup = await scenario();
    const accessory = await fixtures.createAccessoryState({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      rentalId: setup.rental.rentalId,
      sourceRentalDemandLineId: setup.rental.demandLineIds[0],
      period: {
        start: new Date(setup.period.start.getTime() - 30 * 60_000),
        end: new Date(setup.period.end.getTime() + 60 * 60_000),
      },
    });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const proposed = { start: new Date(Date.now() + start * 3_600_000), end: new Date(Date.now() + end * 3_600_000) };

    const result = await reschedule(setup, proposed);

    expect(result.isOk()).toBe(true);
    const after = await fixtures.persistedState(setup.rental.rentalId);
    expect(after.rental.periodStart).toEqual(proposed.start);
    expect(after.rental.periodEnd).toEqual(proposed.end);
    expect(after.rental.version).toBe(before.rental.version + 1);
    expect(after.rental.priceSnapshot).toEqual(before.rental.priceSnapshot);
    expect(after.rental.selections).toEqual(before.rental.selections);
    expect(after.rental.demandLines).toEqual(before.rental.demandLines);
    expect(after.rental.assignedAssets.map(({ id }) => id)).toEqual(before.rental.assignedAssets.map(({ id }) => id));
    expect(after.blocks.map(({ id }) => id)).toEqual(before.blocks.map(({ id }) => id));
    expect(after.blocks.find(({ id }) => id === accessory.blockId)).toBeDefined();
  });

  it('reschedules STAFF_ARRANGED delivery timestamps and preserves every accepted commercial fact', async () => {
    const setup = await scenario({ delivery: 'STAFF_ARRANGED' });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const proposed = { start: new Date(Date.now() + 60 * 3_600_000), end: new Date(Date.now() + 90 * 3_600_000) };
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const emitter = moduleRef.get(EventEmitter2);
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      const rental = await moduleRef.get(RentalRepository).findById(setup.tenant.id, setup.rental.rentalId);
      const prepared = await moduleRef.get(ConfirmedRentalReschedulingPreparationService).prepare({
        rental: rental!,
        expectedVersion: before.rental.version,
        periodStart: proposed.start,
        periodEnd: proposed.end,
      });
      const { preview } = prepared._unsafeUnwrap();
      expect(
        (
          await reschedule(setup, proposed, before.rental.version, {
            reviewIdentity: preview.reviewIdentity!,
          })
        ).isOk(),
      ).toBe(true);
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }

    const after = await fixtures.persistedState(setup.rental.rentalId);
    const beforeDelivery = readAcceptedDeliverySnapshot(before.rental.deliverySnapshot);
    const afterDelivery = readAcceptedDeliverySnapshot(after.rental.deliverySnapshot);
    expect(afterDelivery).toEqual({
      ...beforeDelivery,
      delivery: { ...beforeDelivery.delivery, scheduledAt: proposed.start.toISOString() },
      collection: { ...beforeDelivery.collection, scheduledAt: proposed.end.toISOString() },
    });
    expect(after.rental.acceptedCustomerTotal).toEqual(before.rental.acceptedCustomerTotal);
    expect(after.rental.priceSnapshot).toEqual(before.rental.priceSnapshot);
    expect(events).toEqual([
      expect.objectContaining({
        rentalId: setup.rental.rentalId,
        periodStart: proposed.start,
        periodEnd: proposed.end,
      }),
    ]);
  });

  it.each([
    ['started rental', -1, 24, 'rental_commitment.rental_period_has_started'],
    ['start in the past', -2, 24, 'rental_commitment.rental_period_must_start_in_future'],
    ['invalid chronology', 30, 20, 'rental_commitment.invalid_rental_period'],
  ])('rejects a %s without persisting or publishing', async (_name, start, end, code) => {
    const setup = await scenario({ startHours: _name === 'started rental' ? -1 : 48 });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const emitter = moduleRef.get(EventEmitter2);
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      const result = await reschedule(setup, {
        start: new Date(Date.now() + start * 3_600_000),
        end: new Date(Date.now() + end * 3_600_000),
      });
      expect(result.isErr() && result.error.code).toBe(code);
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
    expect(events).toEqual([]);
  });

  it('rejects stale versions and non-confirmed rentals', async () => {
    const setup = await scenario();
    const current = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    const proposed = { start: new Date(Date.now() + 60 * 3_600_000), end: new Date(Date.now() + 84 * 3_600_000) };
    const stale = await reschedule(setup, proposed, current.version + 1);
    expect(stale.isErr() && stale.error.code).toBe('rental_commitment.rental_version_conflict');
    await prisma.client.v2Rental.update({ where: { id: setup.rental.rentalId }, data: { status: 'CANCELLED' } });
    const invalidStatus = await reschedule(setup, proposed);
    expect(invalidStatus.isErr() && invalidStatus.error.code).toBe(
      'rental_commitment.rental_cannot_be_edited_from_status',
    );
  });

  it.each(['EQUIPMENT', 'ACCESSORY'] as const)(
    'rejects an exact current %s conflict without allocating a replacement',
    async (blockType) => {
      const setup = await scenario();
      const accessory =
        blockType === 'ACCESSORY'
          ? await fixtures.createAccessoryState({
              tenantId: setup.tenant.id,
              branchId: setup.branch.id,
              rentalId: setup.rental.rentalId,
              sourceRentalDemandLineId: setup.rental.demandLineIds[0],
              period: {
                start: new Date(setup.period.start.getTime() - 30 * 60_000),
                end: new Date(setup.period.end.getTime() + 60 * 60_000),
              },
            })
          : undefined;
      const assetId = accessory?.assetId ?? setup.rental.assetIds[0];
      const proposed = {
        start: new Date(Date.now() + 96 * 3_600_000),
        end: new Date(Date.now() + 120 * 3_600_000),
      };
      const other = await fixtures.createConfirmedRental({
        tenantId: setup.tenant.id,
        branchId: setup.branch.id,
        customerId: setup.customer.id,
        period: proposed,
        offerId: setup.commercial.offer.id,
        equipmentTypeId: setup.commercial.equipmentType.id,
      });
      await fixtures.createActiveBlock({
        tenantId: setup.tenant.id,
        rentalId: other.rentalId,
        assetId,
        period: proposed,
        blockType,
      });
      const before = await fixtures.persistedState(setup.rental.rentalId);

      const result = await reschedule(setup, proposed);

      expect(result.isErr() && result.error.code).toBe('rental_commitment.assigned_assets_unavailable');
      expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
      expect((await fixtures.persistedState(setup.rental.rentalId)).rental.assignedAssets).toHaveLength(1);
    },
  );

  it('does not ignore temporary unavailability when a confirmed rental extends its own reservation', async () => {
    const setup = await scenario();
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const endsAt = new Date(setup.period.end.getTime() + 3 * 3_600_000);
    const block = await bus.execute<ScheduleAssetUnavailabilityCommand, AssetUnavailabilityResult<{ id: string }>>(
      new ScheduleAssetUnavailabilityCommand(
        { tenantId: setup.tenant.id, assetId: setup.rental.assetIds[0] },
        {
          startsAt: new Date(setup.period.end.getTime() + 2 * 3_600_000),
          endsAt,
          reason: 'Repair',
        },
      ),
    );
    expect(block.isOk()).toBe(true);

    const result = await reschedule(setup, { start: setup.period.start, end: endsAt });

    expect(result._unsafeUnwrapErr().code).toBe('rental_commitment.assigned_assets_unavailable');
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it('maps exclusion races and persistence mismatches while rolling back and publishing no event', async () => {
    const setup = await scenario();
    const proposed = { start: new Date(Date.now() + 60 * 3_600_000), end: new Date(Date.now() + 84 * 3_600_000) };
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const repository = moduleRef.get(RentalRepository);
    const allocation = moduleRef.get(RentalAssetAllocationService);

    const exclusion = vi
      .spyOn(repository, 'rescheduleConfirmedPeriod')
      .mockRejectedValueOnce(new PostgresExclusionViolationError({ code: '23P01' }));
    const race = await reschedule(setup, proposed);
    expect(race.isErr() && race.error.code).toBe('rental_commitment.assigned_assets_unavailable');
    exclusion.mockRestore();

    const mismatch = vi
      .spyOn(repository, 'rescheduleConfirmedPeriod')
      .mockRejectedValueOnce(new RentalPersistenceStateMismatchError(setup.rental.rentalId, 'asset block', 'changed'));
    vi.spyOn(allocation, 'findConflictingExactAssetIds').mockResolvedValueOnce([]);
    const concurrent = await reschedule(setup, proposed);
    expect(concurrent.isErr() && concurrent.error.code).toBe('rental_commitment.rental_version_conflict');
    mismatch.mockRestore();

    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });
});
