import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../src/core/database/prisma.service';
import { PlatformProblemTypes, createProblemType } from '../../src/core/problem-details';
import { ConfirmRentalFixtures } from '../../src/modules/rental-commitment/features/confirm-rental/testing/confirm-rental.fixtures';
import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, TestFixtures } from '../support/fixtures';
import { expectProblemResponse } from '../support/problem-response';
import { utcDate } from '../support/time';

describe('POST /rental-commitments/rentals/:rentalId/confirm', () => {
  let testApp: E2ETestApp;
  let prisma: PrismaService;
  let coreFixtures: TestFixtures;
  let rentalFixtures: ConfirmRentalFixtures;

  beforeAll(async () => {
    testApp = await createE2ETestApp();
    prisma = testApp.app.get(PrismaService);
    coreFixtures = createTestFixtures(prisma);
    rentalFixtures = new ConfirmRentalFixtures(prisma);
  });

  afterAll(async () => testApp?.close());

  async function scenario() {
    const tenant = await coreFixtures.createTenant();
    const branch = await coreFixtures.createBranch({ tenantId: tenant.id });
    const { customer } = await coreFixtures.createRentalCustomer({ tenantId: tenant.id });
    const user = await coreFixtures.createTenantUser({ tenantId: tenant.id });
    const rental = await rentalFixtures.createRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period: { start: utcDate(2030, 1, 1, 10), end: utcDate(2030, 1, 1, 12) },
    });
    return { tenant, branch, customer, user, rental };
  }

  async function login(user: Awaited<ReturnType<TestFixtures['createTenantUser']>>): Promise<E2ETestClient> {
    const client = createE2ETestClient(testApp.app);
    await client.loginTenantUser({ email: user.user.email, password: user.password });
    return client;
  }

  it('confirms through the authenticated route with a valid CSRF token', async () => {
    const setup = await scenario();
    await rentalFixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.rental.equipmentTypeIds[0],
    });
    const client = await login(setup.user);

    await client
      .withCsrf(client.request().post(`/rental-commitments/rentals/${setup.rental.rentalId}/confirm`))
      .expect(204);

    const rental = await prisma.client.v2Rental.findUniqueOrThrow({
      where: { id: setup.rental.rentalId },
      include: { assignedAssets: true },
    });
    expect(rental.status).toBe('CONFIRMED');
    expect(rental.assignedAssets).toHaveLength(1);
  });

  it('enforces authentication with an otherwise valid CSRF request', async () => {
    const client = createE2ETestClient(testApp.app);
    await client.getCsrfToken();
    const response = await client.withCsrf(
      client.request().post(`/rental-commitments/rentals/${randomUUID()}/confirm`),
    );
    expectProblemResponse(response, { status: 401, type: PlatformProblemTypes.auth.unauthorized });
  });

  it.each([
    ['missing', undefined],
    ['invalid', 'invalid-token'],
  ])('rejects an authenticated request with a %s CSRF token', async (_name, token) => {
    const setup = await scenario();
    const client = await login(setup.user);
    let request = client.request().post(`/rental-commitments/rentals/${setup.rental.rentalId}/confirm`);
    if (token) request = request.set('x-csrf-token', token);
    const response = await request;
    expectProblemResponse(response, { status: 403, type: PlatformProblemTypes.auth.forbidden });
    expect((await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } })).status).toBe(
      'DRAFT',
    );
  });

  it('does not disclose or mutate a real foreign-tenant rental', async () => {
    const tenantA = await coreFixtures.createTenant();
    const userA = await coreFixtures.createTenantUser({ tenantId: tenantA.id });
    const setupB = await scenario();
    const client = await login(userA);

    const response = await client.withCsrf(
      client.request().post(`/rental-commitments/rentals/${setupB.rental.rentalId}/confirm`),
    );
    expectProblemResponse(response, {
      status: 404,
      type: createProblemType('rental_commitment.rental_not_found'),
      code: 'rental_commitment.rental_not_found',
    });
    const rental = await prisma.client.v2Rental.findUniqueOrThrow({
      where: { id: setupB.rental.rentalId },
      include: { assignedAssets: true, ownerSplits: true },
    });
    expect(rental.status).toBe('DRAFT');
    expect(rental.assignedAssets).toHaveLength(0);
    expect(rental.ownerSplits).toHaveLength(0);
  });

  it('returns a conflict and no partial state when inventory is unavailable', async () => {
    const setup = await scenario();
    const client = await login(setup.user);

    const response = await client.withCsrf(
      client.request().post(`/rental-commitments/rentals/${setup.rental.rentalId}/confirm`),
    );
    expectProblemResponse(response, {
      status: 409,
      type: createProblemType('rental_commitment.insufficient_asset_availability'),
      code: 'rental_commitment.insufficient_asset_availability',
    });
    const rental = await prisma.client.v2Rental.findUniqueOrThrow({
      where: { id: setup.rental.rentalId },
      include: { assignedAssets: true, ownerSplits: true },
    });
    expect(rental.status).toBe('DRAFT');
    expect(rental.assignedAssets).toHaveLength(0);
    expect(rental.ownerSplits).toHaveLength(0);
  });
});
