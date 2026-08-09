import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../src/core/database/prisma.service';
import { PlatformProblemTypes, createProblemType } from '../../src/core/problem-details';
import { EditConfirmedRentalFixtures } from '../../src/modules/rental-commitment/features/edit-confirmed-rental/testing/edit-confirmed-rental.fixtures';
import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, TestFixtures } from '../support/fixtures';
import { expectProblemResponse } from '../support/problem-response';
import { utcDate } from '../support/time';

describe('PUT /rental-commitments/confirmed-rentals/:rentalId', () => {
  let testApp: E2ETestApp;
  let prisma: PrismaService;
  let core: TestFixtures;
  let fixtures: EditConfirmedRentalFixtures;

  beforeAll(async () => {
    testApp = await createE2ETestApp();
    prisma = testApp.app.get(PrismaService);
    core = createTestFixtures(prisma);
    fixtures = new EditConfirmedRentalFixtures(prisma);
  });

  afterAll(async () => testApp?.close());

  async function scenario() {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const user = await core.createTenantUser({ tenantId: tenant.id });
    const commercial = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id });
    const rental = await fixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period: between(10, 12),
      offerId: commercial.offer.id,
      equipmentTypeId: commercial.equipmentType.id,
    });
    const persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    return { tenant, branch, customer, user, commercial, rental, persisted };
  }

  function body(setup: Awaited<ReturnType<typeof scenario>>, overrides: Record<string, unknown> = {}) {
    return {
      expectedUpdatedAt: setup.persisted.updatedAt.toISOString(),
      branchId: setup.branch.id,
      period: { start: utcDate(2030, 1, 1, 13).toISOString(), end: utcDate(2030, 1, 1, 15).toISOString() },
      selectedOffers: [{ rentalOfferId: setup.commercial.offer.id, quantity: 1 }],
      fulfillmentMethod: 'PICKUP',
      manualPricingAdjustment: null,
      ...overrides,
    };
  }

  async function login(user: Awaited<ReturnType<TestFixtures['createTenantUser']>>): Promise<E2ETestClient> {
    const client = createE2ETestClient(testApp.app);
    await client.loginTenantUser({ email: user.user.email, password: user.password });
    return client;
  }

  it('edits through the authenticated route and returns the persisted version', async () => {
    const setup = await scenario();
    const client = await login(setup.user);
    const response = await client
      .withCsrf(client.request().put(`/rental-commitments/confirmed-rentals/${setup.rental.rentalId}`))
      .send(body(setup))
      .expect(200);
    expect(response.body).toEqual({
      data: { id: setup.rental.rentalId, updatedAt: expect.any(String) },
    });
    const state = await fixtures.persistedState(setup.rental.rentalId);
    expect(state.rental.periodStart).toEqual(utcDate(2030, 1, 1, 13));
    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0].period).toContain('2030-01-01 13:00:00+00');
    expect(state.blocks[0].period).toContain('2030-01-01 15:00:00+00');
  });

  it('requires authentication', async () => {
    const client = createE2ETestClient(testApp.app);
    await client.getCsrfToken();
    const response = await client
      .withCsrf(client.request().put(`/rental-commitments/confirmed-rentals/${randomUUID()}`))
      .send({});
    expectProblemResponse(response, { status: 401, type: PlatformProblemTypes.auth.unauthorized });
  });

  it.each([
    ['missing', undefined],
    ['invalid', 'invalid-token'],
  ])('rejects an authenticated request with a %s CSRF token without mutation', async (_name, token) => {
    const setup = await scenario();
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const client = await login(setup.user);
    let request = client
      .request()
      .put(`/rental-commitments/confirmed-rentals/${setup.rental.rentalId}`)
      .send(body(setup));
    if (token) request = request.set('x-csrf-token', token);
    const response = await request;
    expectProblemResponse(response, { status: 403, type: PlatformProblemTypes.auth.forbidden });
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it.each([
    [
      'missing expectedUpdatedAt',
      (setup: Awaited<ReturnType<typeof scenario>>) => {
        const value = body(setup) as Record<string, unknown>;
        delete value.expectedUpdatedAt;
        return value;
      },
      400,
    ],
    [
      'invalid quantity',
      (setup: Awaited<ReturnType<typeof scenario>>) =>
        body(setup, { selectedOffers: [{ rentalOfferId: setup.commercial.offer.id, quantity: 0 }] }),
      400,
    ],
    [
      'end before start',
      (setup: Awaited<ReturnType<typeof scenario>>) =>
        body(setup, {
          period: { start: utcDate(2030, 1, 1, 15).toISOString(), end: utcDate(2030, 1, 1, 13).toISOString() },
        }),
      422,
    ],
  ])('validates %s', async (_name, requestBody, status) => {
    const setup = await scenario();
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const client = await login(setup.user);
    const response = await client
      .withCsrf(client.request().put(`/rental-commitments/confirmed-rentals/${setup.rental.rentalId}`))
      .send(requestBody(setup));
    expect(response.status).toBe(status);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it('does not disclose or mutate a foreign-tenant confirmed rental', async () => {
    const tenantA = await core.createTenant();
    const userA = await core.createTenantUser({ tenantId: tenantA.id });
    const setupB = await scenario();
    const before = await fixtures.persistedState(setupB.rental.rentalId);
    const client = await login(userA);
    const response = await client
      .withCsrf(client.request().put(`/rental-commitments/confirmed-rentals/${setupB.rental.rentalId}`))
      .send(body(setupB));
    expectProblemResponse(response, {
      status: 404,
      type: createProblemType('rental_commitment.rental_not_found'),
      code: 'rental_commitment.rental_not_found',
    });
    expect(await fixtures.persistedState(setupB.rental.rentalId)).toEqual(before);
  });

  it('returns 409 and preserves the complete confirmed state when the edited period is unavailable', async () => {
    const setup = await scenario();
    await fixtures.createConfirmedRental({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      customerId: setup.customer.id,
      period: between(13, 15),
      offerId: setup.commercial.offer.id,
      equipmentTypeId: setup.commercial.equipmentType.id,
      assetId: setup.rental.assetIds[0],
    });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const client = await login(setup.user);
    const response = await client
      .withCsrf(client.request().put(`/rental-commitments/confirmed-rentals/${setup.rental.rentalId}`))
      .send(body(setup));
    expectProblemResponse(response, {
      status: 409,
      type: createProblemType('rental_commitment.insufficient_asset_availability'),
      code: 'rental_commitment.insufficient_asset_availability',
    });
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });
});

function between(startHour: number, endHour: number) {
  return { start: utcDate(2030, 1, 1, startHour), end: utcDate(2030, 1, 1, endHour) };
}
