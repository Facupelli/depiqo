import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../src/core/database/prisma.service';
import { PlatformProblemTypes, createProblemType } from '../../src/core/problem-details';
import { ConfirmedRentalFixtures } from '../../src/modules/rental-commitment/testing/confirmed-rental.fixtures';
import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, TestFixtures } from '../support/fixtures';
import { expectProblemResponse } from '../support/problem-response';
import { utcDate } from '../support/time';

describe('DELETE /rental-commitments/rentals/:rentalId', () => {
  let testApp: E2ETestApp;
  let prisma: PrismaService;
  let core: TestFixtures;
  let rentals: ConfirmedRentalFixtures;

  beforeAll(async () => {
    testApp = await createE2ETestApp();
    prisma = testApp.app.get(PrismaService);
    core = createTestFixtures(prisma);
    rentals = new ConfirmedRentalFixtures(prisma);
  });

  afterAll(async () => testApp?.close());

  async function scenario(status: 'CONFIRMED' | 'COMPLETED' = 'CONFIRMED') {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const user = await core.createTenantUser({ tenantId: tenant.id });
    const offer = await rentals.createOffer({ tenantId: tenant.id, branchId: branch.id });
    const rental = await rentals.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period: { start: utcDate(2030, 1, 1, 10), end: utcDate(2030, 1, 1, 12) },
      offerId: offer.offer.id,
      equipmentTypeId: offer.equipmentType.id,
    });
    if (status === 'COMPLETED') {
      await prisma.client.v2Rental.update({ where: { id: rental.rentalId }, data: { status } });
    }
    return { tenant, branch, customer, user, rental };
  }

  async function login(user: Awaited<ReturnType<TestFixtures['createTenantUser']>>): Promise<E2ETestClient> {
    const client = createE2ETestClient(testApp.app);
    await client.loginTenantUser({ email: user.user.email, password: user.password });
    return client;
  }

  it('cancels an authenticated rental and releases its persisted blocks', async () => {
    const setup = await scenario();
    const client = await login(setup.user);

    await client.withCsrf(client.request().delete(`/rental-commitments/rentals/${setup.rental.rentalId}`)).expect(204);

    const state = await rentals.persistedState(setup.rental.rentalId);
    expect(state.rental.status).toBe('CANCELLED');
    expect(state.rental.cancelledAt).not.toBeNull();
    expect(state.blocks.every((block) => block.releasedAt !== null)).toBe(true);
  });

  it('enforces authentication', async () => {
    const client = createE2ETestClient(testApp.app);
    await client.getCsrfToken();
    const response = await client.withCsrf(client.request().delete(`/rental-commitments/rentals/${randomUUID()}`));
    expectProblemResponse(response, { status: 401, type: PlatformProblemTypes.auth.unauthorized });
  });

  it.each([
    ['missing', undefined],
    ['invalid', 'invalid-token'],
  ])('rejects an authenticated request with a %s CSRF token', async (_name, token) => {
    const setup = await scenario();
    const client = await login(setup.user);
    let request = client.request().delete(`/rental-commitments/rentals/${setup.rental.rentalId}`);
    if (token) request = request.set('x-csrf-token', token);
    const response = await request;
    expectProblemResponse(response, { status: 403, type: PlatformProblemTypes.auth.forbidden });
    expect((await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: setup.rental.rentalId } })).status).toBe(
      'CONFIRMED',
    );
  });

  it('does not disclose or mutate a foreign-tenant rental', async () => {
    const tenantA = await core.createTenant();
    const userA = await core.createTenantUser({ tenantId: tenantA.id });
    const setupB = await scenario();
    const before = await rentals.persistedState(setupB.rental.rentalId);
    const client = await login(userA);

    const response = await client.withCsrf(
      client.request().delete(`/rental-commitments/rentals/${setupB.rental.rentalId}`),
    );
    expectProblemResponse(response, {
      status: 404,
      type: createProblemType('rental_commitment.rental_not_found'),
      code: 'rental_commitment.rental_not_found',
    });
    expect(await rentals.persistedState(setupB.rental.rentalId)).toEqual(before);
  });

  it('maps a prohibited lifecycle state to conflict without mutation', async () => {
    const setup = await scenario('COMPLETED');
    const client = await login(setup.user);
    const response = await client.withCsrf(
      client.request().delete(`/rental-commitments/rentals/${setup.rental.rentalId}`),
    );
    expectProblemResponse(response, {
      status: 409,
      type: createProblemType('rental_commitment.rental_cannot_be_cancelled_from_status'),
      code: 'rental_commitment.rental_cannot_be_cancelled_from_status',
    });
    const state = await rentals.persistedState(setup.rental.rentalId);
    expect(state.rental.status).toBe('COMPLETED');
    expect(state.blocks.every((block) => block.releasedAt === null)).toBe(true);
  });

  it('returns the established conflict for a sequential repeated cancellation', async () => {
    const setup = await scenario();
    const client = await login(setup.user);
    await client.withCsrf(client.request().delete(`/rental-commitments/rentals/${setup.rental.rentalId}`)).expect(204);

    const response = await client.withCsrf(
      client.request().delete(`/rental-commitments/rentals/${setup.rental.rentalId}`),
    );
    expectProblemResponse(response, {
      status: 409,
      type: createProblemType('rental_commitment.rental_already_cancelled'),
      code: 'rental_commitment.rental_already_cancelled',
    });
    const state = await rentals.persistedState(setup.rental.rentalId);
    expect(state.blocks.every((block) => block.releasedAt !== null)).toBe(true);
  });
});
