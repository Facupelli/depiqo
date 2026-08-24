import { PrismaService } from '../../src/core/database/prisma.service';
import { ConfirmedRentalFixtures } from '../../src/modules/rental-commitment/testing/confirmed-rental.fixtures';
import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, TestFixtures } from '../support/fixtures';

describe('PATCH confirmed rental details', () => {
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

  it('changes active confirmed-rental notes through the authenticated route', async () => {
    const now = Date.now();
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const user = await core.createTenantUser({ tenantId: tenant.id });
    const offer = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id });
    const rental = await fixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period: { start: new Date(now - 3_600_000), end: new Date(now + 86_400_000) },
      offerId: offer.offer.id,
      equipmentTypeId: offer.equipmentType.id,
    });
    const persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    const client = createE2ETestClient(testApp.app);
    await client.loginTenantUser({ email: user.user.email, password: user.password });
    const response = await client
      .withCsrf(client.request().patch(`/rental-commitments/confirmed-rentals/${rental.rentalId}/details`))
      .send({ expectedVersion: persisted.version, notes: 'Active rental note' })
      .expect(200);
    expect(response.body).toEqual({
      data: { id: rental.rentalId, version: persisted.version + 1, updatedAt: expect.any(String) },
    });
    const changed = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    expect(changed.notes).toBe('Active rental note');
    expect(changed.version).toBe(persisted.version + 1);
    expect(response.body.data.updatedAt).toBe(changed.updatedAt.toISOString());
  });
});
