import { randomUUID } from 'node:crypto';

import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  createPricingIntegrationContext,
  useIntegrationTestContext,
} from '../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../test/support/fixtures';

import { PRICING_RATE_PLAN_BILLING_UNITS, PricingRatePlanAuthoring } from './pricing-rate-plan-authoring.public-api';
import { PricingRentalOfferPricingAssignment } from './pricing-rental-offer-pricing-assignment.public-api';

describe('Pricing authoring public capabilities integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let fixtures: TestFixtures;
  let ratePlanAuthoring: PricingRatePlanAuthoring;
  let rentalOfferPricingAssignment: PricingRentalOfferPricingAssignment;

  useIntegrationTestContext(async () => {
    moduleRef = await createPricingIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    fixtures = createTestFixtures(prisma);
    ratePlanAuthoring = moduleRef.get(PricingRatePlanAuthoring);
    rentalOfferPricingAssignment = moduleRef.get(PricingRentalOfferPricingAssignment);
    return moduleRef;
  });

  async function createRentalOffer(tenantId: string) {
    const branch = await fixtures.createBranch({ tenantId });
    const item = await prisma.client.v2RentableItem.create({
      data: { tenantId, name: `Item ${randomUUID()}`, kind: 'SINGLE', status: 'ACTIVE' },
    });
    return prisma.client.v2RentalOffer.create({
      data: { tenantId, branchId: branch.id, rentableItemId: item.id },
    });
  }

  function createRatePlan(
    tenantId: string,
    overrides: Partial<{
      name: string;
      isActive: boolean;
      tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
    }> = {},
  ) {
    return ratePlanAuthoring.createRatePlan({
      tenantId,
      name: `Rate plan ${randomUUID()}`,
      billingUnit: 'DAY',
      currency: 'USD',
      isActive: true,
      tiers: [{ fromUnit: 1, toUnit: null, pricePerUnit: '100' }],
      ...overrides,
    });
  }

  it('publishes and maps Pricing-owned billing units when creating a Rate Plan', async () => {
    expect(PRICING_RATE_PLAN_BILLING_UNITS).toEqual(['HOUR', 'DAY', 'WEEK']);
    const tenant = await fixtures.createTenant();

    const result = await ratePlanAuthoring.createRatePlan({
      tenantId: tenant.id,
      name: `Hourly ${randomUUID()}`,
      billingUnit: 'HOUR',
      currency: 'USD',
      isActive: true,
      tiers: [{ fromUnit: 1, toUnit: null, pricePerUnit: '100' }],
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    await expect(
      prisma.client.v2RatePlan.findUniqueOrThrow({ where: { id: result.value.ratePlanId } }),
    ).resolves.toEqual(expect.objectContaining({ billingUnit: 'HOUR', currency: 'USD', isActive: true }));
  });

  it('rejects invalid Rate Plan tiers and duplicate Rate Plan names', async () => {
    const tenant = await fixtures.createTenant();
    const name = `Rate plan ${randomUUID()}`;
    const created = await createRatePlan(tenant.id, { name });
    expect(created.isOk()).toBe(true);

    const duplicate = await createRatePlan(tenant.id, { name });
    expect(duplicate.isErr() && duplicate.error.code).toBe('RatePlanNameAlreadyInUse');

    const invalid = await createRatePlan(tenant.id, {
      tiers: [
        { fromUnit: 1, toUnit: 3, pricePerUnit: '100' },
        { fromUnit: 3, toUnit: null, pricePerUnit: '90' },
      ],
    });
    expect(invalid.isErr() && invalid.error.code).toBe('InvalidRatePlan');
  });

  it('assigns a newly created Rate Plan and preserves the existing assignment on reassignment', async () => {
    const tenant = await fixtures.createTenant();
    const rentalOffer = await createRentalOffer(tenant.id);
    const ratePlan = await createRatePlan(tenant.id);
    if (ratePlan.isErr()) throw ratePlan.error;

    const assigned = await rentalOfferPricingAssignment.assignRatePlanToRentalOffer({
      tenantId: tenant.id,
      catalogRentalOfferId: rentalOffer.id,
      ratePlanId: ratePlan.value.ratePlanId,
    });
    expect(assigned.isOk()).toBe(true);
    if (assigned.isErr()) return;

    const reassigned = await rentalOfferPricingAssignment.assignRatePlanToRentalOffer({
      tenantId: tenant.id,
      catalogRentalOfferId: rentalOffer.id,
      ratePlanId: ratePlan.value.ratePlanId,
    });
    expect(reassigned.isOk() && reassigned.value).toEqual(assigned.value);
  });

  it('rejects missing and inactive Rate Plans during assignment', async () => {
    const tenant = await fixtures.createTenant();
    const rentalOffer = await createRentalOffer(tenant.id);

    const missing = await rentalOfferPricingAssignment.assignRatePlanToRentalOffer({
      tenantId: tenant.id,
      catalogRentalOfferId: rentalOffer.id,
      ratePlanId: randomUUID(),
    });
    expect(missing.isErr() && missing.error.code).toBe('RatePlanNotFound');

    const inactiveRatePlan = await createRatePlan(tenant.id, { isActive: false });
    if (inactiveRatePlan.isErr()) throw inactiveRatePlan.error;
    const inactive = await rentalOfferPricingAssignment.assignRatePlanToRentalOffer({
      tenantId: tenant.id,
      catalogRentalOfferId: rentalOffer.id,
      ratePlanId: inactiveRatePlan.value.ratePlanId,
    });
    expect(inactive.isErr() && inactive.error.code).toBe('RatePlanInactive');
  });

  it('does not compensate a Rate Plan creation when a later assignment fails', async () => {
    const tenant = await fixtures.createTenant();
    const ratePlan = await createRatePlan(tenant.id);
    if (ratePlan.isErr()) throw ratePlan.error;

    const assignment = await rentalOfferPricingAssignment.assignRatePlanToRentalOffer({
      tenantId: tenant.id,
      catalogRentalOfferId: randomUUID(),
      ratePlanId: ratePlan.value.ratePlanId,
    });
    expect(assignment.isErr() && assignment.error.code).toBe('RentalOfferNotFound');
    await expect(
      prisma.client.v2RatePlan.findUnique({ where: { id: ratePlan.value.ratePlanId } }),
    ).resolves.not.toBeNull();
  });
});
