import { PrismaService } from '../../src/core/database/prisma.service';
import { ConfirmedRentalFixtures } from '../../src/modules/rental-commitment/testing/confirmed-rental.fixtures';
import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, TestFixtures } from '../support/fixtures';

describe('POST /rental-commitments/confirmed-rentals/:rentalId/selections', () => {
  let testApp: E2ETestApp;
  let prisma: PrismaService;
  let core: TestFixtures;
  let fixtures: ConfirmedRentalFixtures;

  beforeAll(async () => {
    testApp = await createE2ETestApp();
    prisma = testApp.app.get(PrismaService);
    core = createTestFixtures(prisma);
    fixtures = new ConfirmedRentalFixtures(prisma);
  });

  afterAll(async () => testApp?.close());

  it('adds a selection through the authenticated tenant route', async () => {
    const now = Date.now();
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const user = await core.createTenantUser({ tenantId: tenant.id });
    const camera = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id });
    const light = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id });
    const rental = await fixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period: { start: new Date(now - 60 * 60_000), end: new Date(now + 60 * 60_000) },
      offerId: camera.offer.id,
      equipmentTypeId: camera.equipmentType.id,
    });
    await fixtures.createCandidate({
      tenantId: tenant.id,
      branchId: branch.id,
      equipmentTypeId: light.equipmentType.id,
    });
    const persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    const client = createE2ETestClient(testApp.app);
    await client.loginTenantUser({ email: user.user.email, password: user.password });

    const response = await client
      .withCsrf(client.request().post(`/rental-commitments/confirmed-rentals/${rental.rentalId}/selections`))
      .send({ expectedVersion: persisted.version, rentalOfferId: light.offer.id, quantity: 1 })
      .expect(201);

    expect(response.body).toEqual({
      data: { id: rental.rentalId, version: expect.any(Number), updatedAt: expect.any(String) },
    });
    const state = await fixtures.persistedState(rental.rentalId);
    expect(state.rental.selections.map((selection) => selection.rentalOfferId)).toEqual(
      expect.arrayContaining([camera.offer.id, light.offer.id]),
    );
  });
});
