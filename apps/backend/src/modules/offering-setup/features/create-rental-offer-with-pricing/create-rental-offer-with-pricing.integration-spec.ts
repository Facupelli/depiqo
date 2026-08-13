import { randomUUID } from 'node:crypto';

import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  createOfferingSetupIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { PricingRatePlanAuthoring } from '../../../pricing/public-api/pricing-rate-plan-authoring.public-api';
import { CreateRentalOfferWithPricingCommand } from './create-rental-offer-with-pricing.command';
import { CreateRentalOfferWithPricingHandler } from './create-rental-offer-with-pricing.handler';

describe('CreateRentalOfferWithPricing integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let fixtures: TestFixtures;
  let handler: CreateRentalOfferWithPricingHandler;
  let ratePlanAuthoring: PricingRatePlanAuthoring;

  useIntegrationTestContext(async () => {
    moduleRef = await createOfferingSetupIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    fixtures = createTestFixtures(prisma);
    handler = moduleRef.get(CreateRentalOfferWithPricingHandler);
    ratePlanAuthoring = moduleRef.get(PricingRatePlanAuthoring);
    return moduleRef;
  });

  async function setup() {
    const tenant = await fixtures.createTenant();
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    const rentableItem = await prisma.client.v2RentableItem.create({
      data: { tenantId: tenant.id, name: `Item ${randomUUID()}`, kind: 'SINGLE', status: 'ACTIVE' },
    });
    return { tenant, branch, rentableItem };
  }

  async function createRatePlan(tenantId: string, isActive = true) {
    const result = await ratePlanAuthoring.createRatePlan({
      tenantId,
      name: `Rate plan ${randomUUID()}`,
      billingUnit: 'DAY',
      currency: 'USD',
      isActive,
      tiers: [{ fromUnit: 1, toUnit: null, pricePerUnit: '100' }],
    });
    if (result.isErr()) throw result.error;
    return result.value;
  }

  it('creates a Rate Plan and then assigns it to the created Rental Offer', async () => {
    const current = await setup();

    const result = await handler.execute(
      new CreateRentalOfferWithPricingCommand({
        tenantId: current.tenant.id,
        rentableItemId: current.rentableItem.id,
        branchId: current.branch.id,
        pricing: {
          mode: 'CREATE_RATE_PLAN',
          ratePlan: {
            name: `Rate plan ${randomUUID()}`,
            billingUnit: 'DAY',
            currency: 'USD',
            tiers: [{ fromUnit: 1, toUnit: null, pricePerUnit: '100' }],
          },
        },
      }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value).toEqual({
      rentalOfferId: expect.any(String),
      ratePlanId: expect.any(String),
      rentalOfferPricingId: expect.any(String),
    });
    await expect(
      prisma.client.v2RentalOfferPricing.findUniqueOrThrow({ where: { id: result.value.rentalOfferPricingId } }),
    ).resolves.toEqual(
      expect.objectContaining({
        catalogRentalOfferId: result.value.rentalOfferId,
        ratePlanId: result.value.ratePlanId,
        isActive: true,
      }),
    );
  });

  it('assigns an existing active Rate Plan through the assignment capability', async () => {
    const current = await setup();
    const ratePlan = await createRatePlan(current.tenant.id);

    const result = await handler.execute(
      new CreateRentalOfferWithPricingCommand({
        tenantId: current.tenant.id,
        rentableItemId: current.rentableItem.id,
        branchId: current.branch.id,
        pricing: { mode: 'REUSE_RATE_PLAN', ratePlanId: ratePlan.ratePlanId },
      }),
    );

    expect(result.isOk() && result.value.ratePlanId).toBe(ratePlan.ratePlanId);
  });

  it('preserves Offering Setup translation for an inactive existing Rate Plan', async () => {
    const current = await setup();
    const ratePlan = await createRatePlan(current.tenant.id, false);

    const result = await handler.execute(
      new CreateRentalOfferWithPricingCommand({
        tenantId: current.tenant.id,
        rentableItemId: current.rentableItem.id,
        branchId: current.branch.id,
        pricing: { mode: 'REUSE_RATE_PLAN', ratePlanId: ratePlan.ratePlanId },
      }),
    );

    expect(result.isErr() && result.error.code).toBe('offering_setup.rate_plan_inactive');
  });
});
