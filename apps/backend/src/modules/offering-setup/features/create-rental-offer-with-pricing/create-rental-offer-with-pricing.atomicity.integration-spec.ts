import { randomUUID } from 'node:crypto';

import { TestingModule } from '@nestjs/testing';
import { err } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { AttachRatePlanToRentalOfferOperation } from '../../../pricing/application/operations/attach-rate-plan-to-rental-offer.operation';
import {
  createOfferingSetupIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { CreateRentalOfferWithPricingCommand } from './create-rental-offer-with-pricing.command';
import { CreateRentalOfferWithPricingHandler } from './create-rental-offer-with-pricing.handler';

describe('CreateRentalOfferWithPricing atomicity integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let fixtures: TestFixtures;
  let handler: CreateRentalOfferWithPricingHandler;
  let attachRatePlanToRentalOffer: jest.Mock;

  useIntegrationTestContext(async () => {
    attachRatePlanToRentalOffer = jest.fn();
    moduleRef = await createOfferingSetupIntegrationContext([
      {
        provide: AttachRatePlanToRentalOfferOperation,
        useValue: { attachRatePlanToRentalOffer },
      },
    ]);
    prisma = moduleRef.get(PrismaService);
    fixtures = createTestFixtures(prisma);
    handler = moduleRef.get(CreateRentalOfferWithPricingHandler);
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

  function buildCreateModeCommand(tenantId: string, rentableItemId: string, branchId: string) {
    return new CreateRentalOfferWithPricingCommand({
      tenantId,
      rentableItemId,
      branchId,
      pricing: {
        mode: 'CREATE_RATE_PLAN',
        ratePlan: {
          name: `Rate plan ${randomUUID()}`,
          billingUnit: 'DAY',
          currency: 'USD',
          tiers: [{ fromUnit: 1, toUnit: null, pricePerUnit: '100' }],
        },
      },
    });
  }

  function buildReuseModeCommand(tenantId: string, rentableItemId: string, branchId: string, ratePlanId: string) {
    return new CreateRentalOfferWithPricingCommand({
      tenantId,
      rentableItemId,
      branchId,
      pricing: { mode: 'REUSE_RATE_PLAN', ratePlanId },
    });
  }

  async function expectNoSurvivingRecords(tenantId: string): Promise<void> {
    await expect(prisma.client.v2RentalOffer.count({ where: { tenantId } })).resolves.toBe(0);
    await expect(prisma.client.v2RatePlan.count({ where: { tenantId } })).resolves.toBe(0);
    await expect(prisma.client.v2RatePlanTier.count({ where: { tenantId } })).resolves.toBe(0);
    await expect(prisma.client.v2RentalOfferPricing.count({ where: { tenantId } })).resolves.toBe(0);
  }

  beforeEach(() => {
    attachRatePlanToRentalOffer.mockClear();
  });

  it('rolls back the RentalOffer when pricing assignment fails with a typed error', async () => {
    const current = await setup();
    const ratePlan = await prisma.client.v2RatePlan.create({
      data: {
        tenantId: current.tenant.id,
        name: `Rate plan ${randomUUID()}`,
        billingUnit: 'DAY',
        currency: 'USD',
        isActive: true,
      },
    });
    attachRatePlanToRentalOffer.mockResolvedValue(
      err({ code: 'RatePlanNotFound', message: 'The requested rate plan was not found.' }),
    );

    const result = await handler.execute(
      buildReuseModeCommand(current.tenant.id, current.rentableItem.id, current.branch.id, ratePlan.id),
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe('offering_setup.rate_plan_not_found');

    // The assignment seam runs after the real Catalog write has executed inside
    // the outer transaction, so a rolled back RentalOffer proves atomicity.
    expect(attachRatePlanToRentalOffer).toHaveBeenCalledTimes(1);

    await expect(prisma.client.v2RentalOffer.count({ where: { tenantId: current.tenant.id } })).resolves.toBe(0);
    await expect(prisma.client.v2RentalOfferPricing.count({ where: { tenantId: current.tenant.id } })).resolves.toBe(0);
    // The pre-existing RatePlan was created before the workflow and must survive.
    await expect(prisma.client.v2RatePlan.count({ where: { id: ratePlan.id } })).resolves.toBe(1);
  });

  it('rolls back the RentalOffer and the new RatePlan/tiers when final assignment fails', async () => {
    const current = await setup();
    attachRatePlanToRentalOffer.mockResolvedValue(
      err({ code: 'RatePlanNotFound', message: 'The requested rate plan was not found.' }),
    );

    const result = await handler.execute(
      buildCreateModeCommand(current.tenant.id, current.rentableItem.id, current.branch.id),
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe('offering_setup.rate_plan_not_found');

    // Both earlier writes executed for real before the seam failed.
    expect(attachRatePlanToRentalOffer).toHaveBeenCalledTimes(1);
    expect(attachRatePlanToRentalOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: current.tenant.id,
        ratePlanId: expect.any(String),
      }),
    );
    const calledRatePlanId = attachRatePlanToRentalOffer.mock.calls[0][0].ratePlanId;

    await expectNoSurvivingRecords(current.tenant.id);
    await expect(prisma.client.v2RatePlan.count({ where: { id: calledRatePlanId } })).resolves.toBe(0);
  });

  it('rolls back all writes and rethrows when pricing assignment throws unexpectedly', async () => {
    const current = await setup();
    attachRatePlanToRentalOffer.mockRejectedValue(new Error('unexpected pricing infrastructure failure'));

    await expect(
      handler.execute(buildCreateModeCommand(current.tenant.id, current.rentableItem.id, current.branch.id)),
    ).rejects.toThrow('unexpected pricing infrastructure failure');

    await expectNoSurvivingRecords(current.tenant.id);
  });
});
