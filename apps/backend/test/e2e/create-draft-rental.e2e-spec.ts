import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../src/core/database/prisma.service';
import { PlatformProblemTypes, createProblemType } from '../../src/core/problem-details';
import { EditConfirmedRentalFixtures } from '../../src/modules/rental-commitment/features/edit-confirmed-rental/testing/edit-confirmed-rental.fixtures';
import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, TestFixtures } from '../support/fixtures';
import { expectProblemResponse } from '../support/problem-response';
import { utcDate } from '../support/time';

describe('POST /rental-commitments/draft-rentals', () => {
  let app: E2ETestApp;
  let prisma: PrismaService;
  let core: TestFixtures;
  let catalog: EditConfirmedRentalFixtures;

  beforeAll(async () => {
    app = await createE2ETestApp();
    prisma = app.app.get(PrismaService);
    core = createTestFixtures(prisma);
    catalog = new EditConfirmedRentalFixtures(prisma);
  });

  afterAll(async () => app?.close());

  async function scenario(overrides: { supportsDelivery?: boolean } = {}) {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({
      tenantId: tenant.id,
      overrides: { supportsDelivery: overrides.supportsDelivery ?? false },
    });
    const customer = await core.createRentalCustomer({ tenantId: tenant.id });
    const user = await core.createTenantUser({ tenantId: tenant.id });
    const offer = await catalog.createOffer({ tenantId: tenant.id, branchId: branch.id });
    return { tenant, branch, customer, user, offer };
  }

  async function tenantUserClient(setup: Awaited<ReturnType<typeof scenario>>): Promise<E2ETestClient> {
    const client = createE2ETestClient(app.app);
    await client.loginTenantUser({ email: setup.user.user.email, password: setup.user.password });
    return client;
  }

  function body(setup: Awaited<ReturnType<typeof scenario>>, offerId = setup.offer.offer.id) {
    return {
      branchId: setup.branch.id,
      rentalCustomerId: setup.customer.customer.id,
      period: { start: utcDate(2030, 1, 7, 10).toISOString(), end: utcDate(2030, 1, 9, 10).toISOString() },
      selectedOffers: [{ rentalOfferId: offerId, quantity: 10 }],
      fulfillmentMethod: 'PICKUP',
    };
  }

  async function expectNoDraft(setup: Awaited<ReturnType<typeof scenario>>) {
    expect(
      await prisma.client.v2Rental.count({ where: { tenantId: setup.tenant.id, branchId: setup.branch.id } }),
    ).toBe(0);
  }

  it('creates a staff draft despite unavailable inventory and persists no physical commitment', async () => {
    const setup = await scenario();
    const client = await tenantUserClient(setup);
    const response = await client
      .withCsrf(client.request().post('/rental-commitments/draft-rentals'))
      .send(body(setup))
      .expect(201);
    expect(response.body).toEqual({ data: { id: expect.any(String) } });

    const rentalId = response.body.data.id as string;
    const rental = await prisma.client.v2Rental.findUniqueOrThrow({
      where: { id: rentalId },
      include: { selections: true, demandLines: true, assignedAssets: true, ownerSplits: true },
    });
    expect(rental).toEqual(
      expect.objectContaining({
        status: 'DRAFT',
        source: 'STAFF',
        confirmedAt: null,
        bookingSnapshot: null,
        tenantId: setup.tenant.id,
        branchId: setup.branch.id,
        customerId: setup.customer.customer.id,
      }),
    );
    expect(rental.selections).toHaveLength(1);
    expect(rental.demandLines).toHaveLength(1);
    expect(rental.priceSnapshot).toEqual(expect.objectContaining({ context: 'DRAFT' }));
    expect(rental.assignedAssets).toEqual([]);
    expect(rental.ownerSplits).toEqual([]);
    expect(await prisma.client.v2AssetBlock.count({ where: { rentalId, releasedAt: null } })).toBe(0);
  });

  it('requires authentication', async () => {
    const setup = await scenario();
    const client = createE2ETestClient(app.app);
    await client.getCsrfToken();
    const response = await client
      .withCsrf(client.request().post('/rental-commitments/draft-rentals'))
      .send(body(setup));
    expectProblemResponse(response, { status: 401, type: PlatformProblemTypes.auth.unauthorized });
    await expectNoDraft(setup);
  });

  it('forbids an authenticated tenant customer', async () => {
    const setup = await scenario();
    const authenticatingCustomer = await core.createRentalCustomer({
      tenantId: setup.tenant.id,
      localCredential: {},
    });
    const client = createE2ETestClient(app.app);
    await client.loginTenantCustomer({
      tenantId: setup.tenant.id,
      email: authenticatingCustomer.customer.email,
      password: authenticatingCustomer.password,
    });
    const response = await client
      .withCsrf(client.request().post('/rental-commitments/draft-rentals'))
      .send(body(setup));
    expectProblemResponse(response, { status: 403, type: PlatformProblemTypes.auth.forbidden });
    await expectNoDraft(setup);
  });

  it.each([
    ['missing', undefined],
    ['invalid', 'invalid-token'],
  ])('rejects a %s CSRF token', async (_name, token) => {
    const setup = await scenario();
    const client = await tenantUserClient(setup);
    let request = client.request().post('/rental-commitments/draft-rentals').send(body(setup));
    if (token) request = request.set('x-csrf-token', token);
    const response = await request;
    expectProblemResponse(response, { status: 403, type: PlatformProblemTypes.auth.forbidden });
    await expectNoDraft(setup);
  });

  it.each([
    [
      'malformed quantity',
      (setup: Awaited<ReturnType<typeof scenario>>) => ({
        ...body(setup),
        selectedOffers: [{ rentalOfferId: setup.offer.offer.id, quantity: 0 }],
      }),
    ],
    [
      'malformed date',
      (setup: Awaited<ReturnType<typeof scenario>>) => ({
        ...body(setup),
        period: { start: 'not-a-date', end: 'also-not-a-date' },
      }),
    ],
  ])('returns request validation Problem Details for %s', async (_name, makeBody) => {
    const setup = await scenario();
    const client = await tenantUserClient(setup);
    const response = await client
      .withCsrf(client.request().post('/rental-commitments/draft-rentals'))
      .send(makeBody(setup));
    expectProblemResponse(response, { status: 400, type: PlatformProblemTypes.request.validationFailed });
    await expectNoDraft(setup);
  });

  it.each([
    ['equal', utcDate(2030, 1, 7, 10).toISOString(), utcDate(2030, 1, 7, 10).toISOString()],
    ['reversed', utcDate(2030, 1, 7, 11).toISOString(), utcDate(2030, 1, 7, 10).toISOString()],
  ])('rejects an %s period', async (_name, start, end) => {
    const setup = await scenario();
    const client = await tenantUserClient(setup);
    const response = await client
      .withCsrf(client.request().post('/rental-commitments/draft-rentals'))
      .send({ ...body(setup), period: { start, end } });
    expectProblemResponse(response, {
      status: 422,
      type: createProblemType('rental_commitment.invalid_rental_period'),
      code: 'rental_commitment.invalid_rental_period',
    });
    await expectNoDraft(setup);
  });

  it('returns a dedicated semantic error for duplicate offer IDs', async () => {
    const setup = await scenario();
    const client = await tenantUserClient(setup);
    const response = await client.withCsrf(client.request().post('/rental-commitments/draft-rentals')).send({
      ...body(setup),
      selectedOffers: [
        { rentalOfferId: setup.offer.offer.id, quantity: 1 },
        { rentalOfferId: setup.offer.offer.id, quantity: 1 },
      ],
    });
    expectProblemResponse(response, {
      status: 422,
      type: createProblemType('rental_commitment.duplicate_rental_offer_selection'),
      code: 'rental_commitment.duplicate_rental_offer_selection',
    });
    await expectNoDraft(setup);
  });

  it('does not disclose a real foreign customer', async () => {
    const setup = await scenario();
    const foreign = await scenario();
    const client = await tenantUserClient(setup);
    const response = await client
      .withCsrf(client.request().post('/rental-commitments/draft-rentals'))
      .send({ ...body(setup), rentalCustomerId: foreign.customer.customer.id });
    expectProblemResponse(response, {
      status: 422,
      type: createProblemType('rental_commitment.customer_unavailable'),
      code: 'rental_commitment.customer_unavailable',
    });
    await expectNoDraft(setup);
  });

  it.each([
    ['unknown', async () => randomUUID()],
    ['foreign tenant', async () => (await scenario()).offer.offer.id],
    [
      'wrong branch',
      async (setup: Awaited<ReturnType<typeof scenario>>) => {
        const branch = await core.createBranch({ tenantId: setup.tenant.id });
        return (await catalog.createOffer({ tenantId: setup.tenant.id, branchId: branch.id })).offer.id;
      },
    ],
  ])('returns non-disclosing not found for a %s offer', async (_name, getOfferId) => {
    const setup = await scenario();
    const client = await tenantUserClient(setup);
    const response = await client
      .withCsrf(client.request().post('/rental-commitments/draft-rentals'))
      .send(body(setup, await getOfferId(setup)));
    expectProblemResponse(response, {
      status: 404,
      type: createProblemType('rental_commitment.rental_offer_not_found'),
      code: 'rental_commitment.rental_offer_not_found',
    });
    await expectNoDraft(setup);
  });

  it.each(['not-money', '-1', '0'])('returns typed invalid pricing for target total %s', async (targetTotal) => {
    const setup = await scenario();
    const client = await tenantUserClient(setup);
    const response = await client
      .withCsrf(client.request().post('/rental-commitments/draft-rentals'))
      .send({ ...body(setup), manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal } });
    expectProblemResponse(response, {
      status: 422,
      type: createProblemType('rental_commitment.invalid_pricing_input'),
      code: 'rental_commitment.invalid_pricing_input',
    });
    await expectNoDraft(setup);
  });

  it('strips delivery details from a PICKUP request', async () => {
    const setup = await scenario();
    const client = await tenantUserClient(setup);
    const response = await client
      .withCsrf(client.request().post('/rental-commitments/draft-rentals'))
      .send({
        ...body(setup),
        deliveryDetails: { addressLine1: 'Ignored', city: 'Ignored' },
      })
      .expect(201);
    const rentalId = response.body.data.id as string;
    expect(await prisma.client.v2RentalDeliveryDetails.findUnique({ where: { rentalOrderId: rentalId } })).toBeNull();
  });

  it('rejects DELIVERY without required details', async () => {
    const setup = await scenario({ supportsDelivery: true });
    const client = await tenantUserClient(setup);
    const response = await client.withCsrf(client.request().post('/rental-commitments/draft-rentals')).send({
      ...body(setup),
      fulfillmentMethod: 'DELIVERY',
      deliveryDetails: undefined,
    });
    expectProblemResponse(response, {
      status: 422,
      type: createProblemType('rental_commitment.invalid_rental_field'),
      code: 'rental_commitment.invalid_rental_field',
    });
    await expectNoDraft(setup);
  });

  it('rejects unsupported delivery', async () => {
    const setup = await scenario();
    const client = await tenantUserClient(setup);
    const response = await client.withCsrf(client.request().post('/rental-commitments/draft-rentals')).send({
      ...body(setup),
      fulfillmentMethod: 'DELIVERY',
      deliveryDetails: { addressLine1: '10 Road', city: 'City' },
    });
    expectProblemResponse(response, {
      status: 422,
      type: createProblemType('rental_commitment.unsupported_branch_fulfillment_method'),
      code: 'rental_commitment.unsupported_branch_fulfillment_method',
    });
    await expectNoDraft(setup);
  });
});
