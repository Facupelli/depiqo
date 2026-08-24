import { CommandBus } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/core/database/prisma.service';
import { ConfirmedRentalEditedIntegrationEvent } from '../../public-api/events/rental-lifecycle.integration-events';
import { FulfillmentMethod } from '../../domain/rental-status';
import {
  createRentalCommitmentIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { ChangeRentalDetailsCommand, ChangeRentalDetailsPatch } from './change-rental-details.command';
import { ChangeRentalDetailsResult } from './change-rental-details.handler';
import { EditConfirmedRentalFixtures } from '../edit-confirmed-rental/testing/edit-confirmed-rental.fixtures';

const delivery = {
  addressLine1: '123 Rental Street',
  city: 'Austin',
  state: 'TX',
  postalCode: '78701',
  country: 'US',
};

describe('ChangeRentalDetails integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let bus: CommandBus;
  let core: TestFixtures;
  let fixtures: EditConfirmedRentalFixtures;

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    bus = moduleRef.get(CommandBus);
    core = createTestFixtures(prisma);
    fixtures = new EditConfirmedRentalFixtures(prisma);
    return moduleRef;
  });

  async function scenario(started: boolean | 'ENDED' = false, supportsDelivery = true) {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id, overrides: { supportsDelivery } });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const { user } = await core.createTenantUser({ tenantId: tenant.id });
    const commercial = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id });
    const now = Date.now();
    const rental = await fixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period:
        started === 'ENDED'
          ? { start: new Date(now - 7_200_000), end: new Date(now - 3_600_000) }
          : started
            ? { start: new Date(now - 3_600_000), end: new Date(now + 86_400_000) }
            : { start: new Date(now + 86_400_000), end: new Date(now + 172_800_000) },
      offerId: commercial.offer.id,
      equipmentTypeId: commercial.equipmentType.id,
    });
    return { tenant, branch, customer, user, commercial, rental };
  }

  async function change(
    setup: Awaited<ReturnType<typeof scenario>>,
    patch: ChangeRentalDetailsPatch,
    version?: number,
  ) {
    const current = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    return bus.execute<ChangeRentalDetailsCommand, ChangeRentalDetailsResult>(
      new ChangeRentalDetailsCommand({
        tenantId: setup.tenant.id,
        tenantUserId: setup.user.id,
        rentalId: setup.rental.rentalId,
        expectedVersion: version ?? current.version,
        patch,
      }),
    );
  }

  it('changes active notes, insurance, and manual pricing while preserving operational history', async () => {
    const setup = await scenario(true);
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const assignment = before.rental.assignedAssets[0];
    await prisma.client.v2AssignedAsset.update({
      where: { id: assignment.id },
      data: {
        ownershipSnapshot: {
          kind: 'THIRD_PARTY',
          ownerId: 'owner-details',
          contractId: 'contract-details',
          basis: 'NET',
          ownerShare: '0.4',
        },
      },
    });
    const stableBefore = await fixtures.persistedState(setup.rental.rentalId);
    const emitter = moduleRef.get(EventEmitter2);
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      const result = await change(setup, {
        notes: 'Active handling note',
        insuranceSelected: true,
        manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal: '80.00', reason: 'Approved' },
      });
      expect(result.isOk()).toBe(true);
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }
    const after = await fixtures.persistedState(setup.rental.rentalId);
    expect(after.rental.notes).toBe('Active handling note');
    expect(after.rental.insuranceSelected).toBe(true);
    expect(after.rental.priceSnapshot).toHaveProperty('manualPricingAdjustment.targetTotal', '80.00');
    expect(after.rental.ownerSplits[0].basisAmount.toString()).toBe('80');
    expect(after.rental.selections).toEqual(stableBefore.rental.selections);
    expect(after.rental.demandLines).toEqual(stableBefore.rental.demandLines);
    expect(after.rental.assignedAssets).toEqual(stableBefore.rental.assignedAssets);
    expect(after.blocks).toEqual(stableBefore.blocks);
    expect(events).toEqual([expect.objectContaining({ rentalId: setup.rental.rentalId })]);
  });

  it('enforces pre-start delivery invariants and branch delivery support', async () => {
    const setup = await scenario(false, true);
    const missing = await change(setup, { fulfillmentMethod: FulfillmentMethod.Delivery });
    expect(missing.isErr() && missing.error.code).toBe('rental_commitment.invalid_rental_field');
    expect(
      (await change(setup, { fulfillmentMethod: FulfillmentMethod.Delivery, deliveryDetails: delivery })).isOk(),
    ).toBe(true);
    const notCleared = await change(setup, { fulfillmentMethod: FulfillmentMethod.Pickup });
    expect(notCleared.isErr() && notCleared.error.code).toBe('rental_commitment.invalid_rental_field');
    expect((await change(setup, { fulfillmentMethod: FulfillmentMethod.Pickup, deliveryDetails: null })).isOk()).toBe(
      true,
    );

    const unsupported = await scenario(false, false);
    const result = await change(unsupported, {
      fulfillmentMethod: FulfillmentMethod.Delivery,
      deliveryDetails: delivery,
    });
    expect(result.isErr() && result.error.code).toBe('rental_commitment.unsupported_branch_fulfillment_method');
  });

  it('rejects fulfillment and delivery changes after start without changing state', async () => {
    const setup = await scenario(true);
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const result = await change(setup, { fulfillmentMethod: FulfillmentMethod.Delivery, deliveryDetails: delivery });
    expect(result.isErr() && result.error.code).toBe('rental_commitment.invalid_rental_field');
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it('clears manual pricing back to standard pricing and recalculates owner splits', async () => {
    const setup = await scenario(true);
    const state = await fixtures.persistedState(setup.rental.rentalId);
    await prisma.client.v2AssignedAsset.update({
      where: { id: state.rental.assignedAssets[0].id },
      data: {
        ownershipSnapshot: {
          kind: 'THIRD_PARTY',
          ownerId: 'owner-clear',
          contractId: 'contract-clear',
          basis: 'NET',
          ownerShare: '0.4',
        },
      },
    });
    expect(
      (await change(setup, { manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal: '80.00' } })).isOk(),
    ).toBe(true);
    const adjusted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    const equivalent = await change(setup, {
      manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal: '80' },
    });
    expect(equivalent.isOk() && equivalent.value.version).toBe(adjusted.version);
    const changedReason = await change(setup, {
      manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal: '80.00', reason: 'Updated reason' },
    });
    expect(changedReason.isOk() && changedReason.value.version).toBe(adjusted.version + 1);
    const cleared = await change(setup, { manualPricingAdjustment: null });
    expect(cleared.isOk()).toBe(true);
    const after = await fixtures.persistedState(setup.rental.rentalId);
    expect(after.rental.priceSnapshot).not.toHaveProperty('manualPricingAdjustment');
    expect(after.rental.ownerSplits[0].basisAmount.toString()).toBe('100');
  });

  it('returns current metadata for a true no-op without save or event, including after end', async () => {
    const setup = await scenario('ENDED');
    const before = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    const emitter = moduleRef.get(EventEmitter2);
    const events: ConfirmedRentalEditedIntegrationEvent[] = [];
    const listener = (event: ConfirmedRentalEditedIntegrationEvent) => events.push(event);
    emitter.on(ConfirmedRentalEditedIntegrationEvent.name, listener);
    try {
      const result = await change(setup, {});
      expect(result.isOk() && result.value).toEqual({
        rentalId: setup.rental.rentalId,
        version: before.version,
        updatedAt: before.updatedAt,
      });
    } finally {
      emitter.off(ConfirmedRentalEditedIntegrationEvent.name, listener);
    }
    const after = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    expect(after.version).toBe(before.version);
    expect(events).toHaveLength(0);
  });

  it('rejects a stale expected version', async () => {
    const setup = await scenario();
    const current = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } });
    const result = await change(setup, { notes: 'Stale' }, current.version + 1);
    expect(result.isErr() && result.error.code).toBe('rental_commitment.rental_version_conflict');
  });
});
