import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import {
  createRentalCommitmentIntegrationContext,
  useIntegrationTestContext,
} from '../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../test/support/fixtures';

import { FulfillmentMethod } from '../domain/rental-status';
import { RentalPeriod } from '../domain/value-objects/rental-period.value-object';
import { ConfirmedRentalFixtures } from '../testing/confirmed-rental.fixtures';
import { RentalRepository } from './rental.repository';

describe('PrismaRentalRepository confirmed period reschedule persistence', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let unitOfWork: PrismaUnitOfWork;
  let repository: RentalRepository;
  let coreFixtures: TestFixtures;
  let rentalFixtures: ConfirmedRentalFixtures;

  const originalPeriod = {
    start: new Date('2030-01-10T10:00:00.000Z'),
    end: new Date('2030-01-12T18:00:00.000Z'),
  };
  const rescheduledPeriod = new RentalPeriod(
    new Date('2030-01-20T11:00:00.000Z'),
    new Date('2030-01-23T19:00:00.000Z'),
  );
  const operationTime = new Date('2030-01-01T08:00:00.000Z');

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    unitOfWork = moduleRef.get(PrismaUnitOfWork);
    repository = moduleRef.get(RentalRepository);
    coreFixtures = createTestFixtures(prisma);
    rentalFixtures = new ConfirmedRentalFixtures(prisma);
    return moduleRef;
  });

  async function setup(quantity = 1) {
    const tenant = await coreFixtures.createTenant();
    const branch = await coreFixtures.createBranch({ tenantId: tenant.id });
    const { customer } = await coreFixtures.createRentalCustomer({ tenantId: tenant.id });
    const offer = await rentalFixtures.createOffer({ tenantId: tenant.id, branchId: branch.id });
    const rental = await rentalFixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period: originalPeriod,
      offerId: offer.offer.id,
      equipmentTypeId: offer.equipmentType.id,
      quantity,
      acceptedAssetBuffer: { beforeBufferMinutes: 30, afterBufferMinutes: 45 },
    });
    return { tenant, branch, customer, offer, rental };
  }

  async function reschedule(tenantId: string, rentalId: string, expectedVersion?: number) {
    return unitOfWork.runInTransaction(async ({ tx }) => {
      const rental = await repository.findById(tenantId, rentalId, tx);
      if (!rental) throw new Error('Expected rental fixture to exist.');
      rental.rescheduleConfirmedPeriod({ period: rescheduledPeriod, operationTime })._unsafeUnwrap();
      return repository.rescheduleConfirmedPeriod(rental, {
        expectedVersion: expectedVersion ?? rental.version,
        tx,
      });
    });
  }

  it('updates a PICKUP rental and current operational rows in place while preserving history and commercial facts', async () => {
    const scenario = await setup();
    const accessory = await rentalFixtures.createAccessoryState({
      tenantId: scenario.tenant.id,
      branchId: scenario.branch.id,
      rentalId: scenario.rental.rentalId,
      sourceRentalDemandLineId: scenario.rental.demandLineIds[0],
      period: originalPeriod,
    });
    const historicalAssetId = await rentalFixtures.createCandidate({
      tenantId: scenario.tenant.id,
      branchId: scenario.branch.id,
      equipmentTypeId: scenario.offer.equipmentType.id,
    });
    const historicalAssignment = await prisma.client.v2AssignedAsset.create({
      data: {
        tenantId: scenario.tenant.id,
        rentalId: scenario.rental.rentalId,
        rentalDemandLineId: scenario.rental.demandLineIds[0],
        assetId: historicalAssetId,
        ownershipSnapshot: { kind: 'TENANT_OWNED' },
        effectiveFrom: new Date('2029-12-01T10:00:00.000Z'),
        effectiveUntil: new Date('2029-12-02T10:00:00.000Z'),
      },
    });
    const historicalBlockId = await rentalFixtures.createActiveBlock({
      tenantId: scenario.tenant.id,
      rentalId: scenario.rental.rentalId,
      assetId: historicalAssetId,
      period: {
        start: new Date(historicalAssignment.effectiveFrom.getTime() - 30 * 60_000),
        end: new Date(historicalAssignment.effectiveUntil!.getTime() + 45 * 60_000),
      },
    });
    const releasedBlockId = await rentalFixtures.createActiveBlock({
      tenantId: scenario.tenant.id,
      rentalId: scenario.rental.rentalId,
      assetId: accessory.assetId,
      period: { start: new Date('2029-11-01T10:00:00.000Z'), end: new Date('2029-11-02T10:00:00.000Z') },
      blockType: 'ACCESSORY',
    });
    await prisma.client.$executeRaw`
      UPDATE v2_asset_blocks SET released_at = ${operationTime} WHERE id = ${releasedBlockId}
    `;

    const before = await rentalFixtures.persistedState(scenario.rental.rentalId);
    const result = await reschedule(scenario.tenant.id, scenario.rental.rentalId);
    const after = await rentalFixtures.persistedState(scenario.rental.rentalId);

    expect(result).toEqual(expect.objectContaining({ version: before.rental.version + 1 }));
    expect(after.rental.periodStart).toEqual(rescheduledPeriod.start);
    expect(after.rental.periodEnd).toEqual(rescheduledPeriod.end);
    expect(after.rental.deliverySnapshot).toBeNull();
    expect(after.rental.version).toBe(before.rental.version + 1);

    const currentBefore = before.rental.assignedAssets.find((row) => row.effectiveUntil === null)!;
    const currentAfter = after.rental.assignedAssets.find((row) => row.id === currentBefore.id)!;
    expect(currentAfter).toEqual({ ...currentBefore, effectiveFrom: rescheduledPeriod.start });
    expect(after.rental.assignedAssets.find((row) => row.id === historicalAssignment.id)).toEqual(
      before.rental.assignedAssets.find((row) => row.id === historicalAssignment.id),
    );

    const resizedIds = new Set([
      before.blocks.find((block) => block.assetId === currentBefore.assetId && block.releasedAt === null)!.id,
      accessory.blockId,
    ]);
    for (const block of after.blocks.filter((row) => resizedIds.has(row.id))) {
      expect(block.period.startsWith('["2030-01-20 10:30:00+00"')).toBe(true);
      expect(block.period.endsWith('"2030-01-23 19:45:00+00")')).toBe(true);
      expect(before.blocks.find((row) => row.id === block.id)).toEqual(
        expect.objectContaining({ id: block.id, createdAt: block.createdAt }),
      );
    }
    expect(after.blocks.find((row) => row.id === historicalBlockId)).toEqual(
      before.blocks.find((row) => row.id === historicalBlockId),
    );
    expect(after.blocks.find((row) => row.id === releasedBlockId)).toEqual(
      before.blocks.find((row) => row.id === releasedBlockId),
    );

    const rentalOwnedFields = ['periodStart', 'periodEnd', 'version', 'updatedAt'] as const;
    const preservedBefore = { ...before.rental };
    const preservedAfter = { ...after.rental };
    for (const field of rentalOwnedFields) {
      delete preservedBefore[field];
      delete preservedAfter[field];
    }
    delete preservedBefore.assignedAssets;
    delete preservedAfter.assignedAssets;
    expect(preservedAfter).toEqual(preservedBefore);
  });

  it('updates only DELIVERY schedule timestamps inside the accepted snapshot', async () => {
    const scenario = await setup();
    const acceptedDelivery = {
      schema: 'v2.accepted-delivery',
      version: 1,
      distanceMeters: 12500,
      delivery: {
        scheduledAt: originalPeriod.start.toISOString(),
        serviceLevel: 'SPECIAL',
        basePrice: '20.00',
        surcharge: '5.00',
        total: '25.00',
      },
      collection: {
        scheduledAt: originalPeriod.end.toISOString(),
        serviceLevel: 'NORMAL',
        basePrice: '15.00',
        surcharge: '0.00',
        total: '15.00',
      },
      currency: 'USD',
      deliveryTotal: '40.00',
      transportReservationMinutes: 45,
    };
    await prisma.client.v2Rental.update({
      where: { id: scenario.rental.rentalId },
      data: {
        fulfillmentMethod: FulfillmentMethod.Delivery,
        deliverySnapshot: acceptedDelivery,
        acceptedCustomerTotal: '140.00',
        deliveryDetails: {
          create: {
            tenantId: scenario.tenant.id,
            address: 'Main Street 1',
            formattedAddress: 'Main Street 1, City',
            latitude: 10,
            longitude: 20,
          },
        },
      },
    });
    const deliveryBlockPeriod = new RentalPeriod(
      new Date(originalPeriod.start.getTime() - 75 * 60_000),
      new Date(originalPeriod.end.getTime() + 90 * 60_000),
    );
    await prisma.client.$executeRaw`
      UPDATE v2_asset_blocks
      SET period = ${deliveryBlockPeriod.toPostgresRange()}::tstzrange
      WHERE rental_id = ${scenario.rental.rentalId}
    `;

    const before = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: scenario.rental.rentalId } });
    await reschedule(scenario.tenant.id, scenario.rental.rentalId);
    const after = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: scenario.rental.rentalId } });

    expect(after.deliverySnapshot).toEqual({
      ...acceptedDelivery,
      delivery: { ...acceptedDelivery.delivery, scheduledAt: rescheduledPeriod.start.toISOString() },
      collection: { ...acceptedDelivery.collection, scheduledAt: rescheduledPeriod.end.toISOString() },
    });
    expect(after.priceSnapshot).toEqual(before.priceSnapshot);
    expect(after.acceptedCustomerTotal).toEqual(before.acceptedCustomerTotal);
  });

  it('returns null for a stale expected version without persisting any changes', async () => {
    const scenario = await setup();
    const before = await rentalFixtures.persistedState(scenario.rental.rentalId);

    await expect(
      reschedule(scenario.tenant.id, scenario.rental.rentalId, before.rental.version - 1),
    ).resolves.toBeNull();

    expect(await rentalFixtures.persistedState(scenario.rental.rentalId)).toEqual(before);
  });

  it('maps an exclusion conflict and rolls back the rental, delivery, assignments, and earlier block resize', async () => {
    const scenario = await setup(2);
    const acceptedDelivery = {
      schema: 'v2.accepted-delivery',
      version: 1,
      distanceMeters: 1000,
      delivery: {
        scheduledAt: originalPeriod.start.toISOString(),
        serviceLevel: 'NORMAL',
        basePrice: '10.00',
        surcharge: '0.00',
        total: '10.00',
      },
      collection: {
        scheduledAt: originalPeriod.end.toISOString(),
        serviceLevel: 'NORMAL',
        basePrice: '10.00',
        surcharge: '0.00',
        total: '10.00',
      },
      currency: 'USD',
      deliveryTotal: '20.00',
      transportReservationMinutes: 45,
    };
    await prisma.client.v2Rental.update({
      where: { id: scenario.rental.rentalId },
      data: {
        fulfillmentMethod: FulfillmentMethod.Delivery,
        deliverySnapshot: acceptedDelivery,
        acceptedCustomerTotal: '120.00',
        deliveryDetails: {
          create: {
            tenantId: scenario.tenant.id,
            address: 'Conflict Street 1',
            formattedAddress: 'Conflict Street 1, City',
            latitude: 10,
            longitude: 20,
          },
        },
      },
    });
    const originalDeliveryBlockPeriod = new RentalPeriod(
      new Date(originalPeriod.start.getTime() - 75 * 60_000),
      new Date(originalPeriod.end.getTime() + 90 * 60_000),
    );
    await prisma.client.$executeRaw`
      UPDATE v2_asset_blocks
      SET period = ${originalDeliveryBlockPeriod.toPostgresRange()}::tstzrange
      WHERE rental_id = ${scenario.rental.rentalId}
    `;
    const before = await rentalFixtures.persistedState(scenario.rental.rentalId);
    const aggregate = await repository.findById(scenario.tenant.id, scenario.rental.rentalId);
    if (!aggregate) throw new Error('Expected rental fixture to exist.');
    aggregate.rescheduleConfirmedPeriod({ period: rescheduledPeriod, operationTime })._unsafeUnwrap();
    const currentBlocks = aggregate.currentOperationalAssetBlocks;
    expect(currentBlocks).toHaveLength(2);
    const conflictingAssetId = currentBlocks[currentBlocks.length - 1].assetId;
    const competingRental = await rentalFixtures.createConfirmedRental({
      tenantId: scenario.tenant.id,
      branchId: scenario.branch.id,
      customerId: scenario.customer.id,
      period: { start: rescheduledPeriod.start, end: rescheduledPeriod.end },
      offerId: scenario.offer.offer.id,
      equipmentTypeId: scenario.offer.equipmentType.id,
      assetId: conflictingAssetId,
    });
    const beforeAttempt = await rentalFixtures.persistedState(scenario.rental.rentalId);
    const competingBeforeAttempt = await rentalFixtures.persistedState(competingRental.rentalId);

    await expect(
      unitOfWork.runInTransaction(({ tx }) =>
        repository.rescheduleConfirmedPeriod(aggregate, { expectedVersion: aggregate.version, tx }),
      ),
    ).rejects.toBeInstanceOf(PostgresExclusionViolationError);

    expect(await rentalFixtures.persistedState(scenario.rental.rentalId)).toEqual(beforeAttempt);
    expect(await rentalFixtures.persistedState(competingRental.rentalId)).toEqual(competingBeforeAttempt);
    expect(beforeAttempt).toEqual(before);
    expect(beforeAttempt.rental.periodStart).toEqual(originalPeriod.start);
    expect(beforeAttempt.rental.periodEnd).toEqual(originalPeriod.end);
    expect(beforeAttempt.rental.deliverySnapshot).toEqual(acceptedDelivery);
  });
});
