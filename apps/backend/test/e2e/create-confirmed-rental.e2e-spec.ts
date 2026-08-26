import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../src/core/database/prisma.service';
import { PlatformProblemTypes, createProblemType } from '../../src/core/problem-details';
import { ConfirmRentalFixtures } from '../../src/modules/rental-commitment/features/confirm-rental/testing/confirm-rental.fixtures';
import { ConfirmedRentalFixtures } from '../../src/modules/rental-commitment/testing/confirmed-rental.fixtures';
import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, TestFixtures } from '../support/fixtures';
import { expectProblemResponse } from '../support/problem-response';
import { utcDate } from '../support/time';

describe('POST /rental-commitments/confirmed-rentals', () => {
  let testApp: E2ETestApp;
  let prisma: PrismaService;
  let core: TestFixtures;
  let rentalFixtures: ConfirmRentalFixtures;
  let catalogFixtures: ConfirmedRentalFixtures;

  beforeAll(async () => {
    testApp = await createE2ETestApp();
    prisma = testApp.app.get(PrismaService);
    core = createTestFixtures(prisma);
    rentalFixtures = new ConfirmRentalFixtures(prisma);
    catalogFixtures = new ConfirmedRentalFixtures(prisma);
  });

  afterAll(async () => testApp?.close());

  async function scenario() {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const customer = await core.createRentalCustomer({
      tenantId: tenant.id,
      localCredential: {},
    });
    await prisma.client.v2BranchSchedule.createMany({
      data: [
        { branchId: branch.id, type: 'PICKUP', dayOfWeek: 1, openTime: 0, closeTime: 1439 },
        { branchId: branch.id, type: 'RETURN', dayOfWeek: 1, openTime: 0, closeTime: 1439 },
      ],
    });
    const catalog = await catalogFixtures.createOffer({ tenantId: tenant.id, branchId: branch.id });
    return { tenant, branch, customer, catalog };
  }

  async function login(setup: Awaited<ReturnType<typeof scenario>>): Promise<E2ETestClient> {
    const client = createE2ETestClient(testApp.app);
    await client.loginTenantCustomer(
      {
        email: setup.customer.customer.email,
        password: setup.customer.password,
      },
      storefrontTenantContext(setup.tenant),
    );
    return client;
  }

  function body(setup: Awaited<ReturnType<typeof scenario>>, offerId = setup.catalog.offer.id) {
    return {
      branchId: setup.branch.id,
      period: { start: utcDate(2030, 1, 7, 10).toISOString(), end: utcDate(2030, 1, 7, 12).toISOString() },
      selectedOffers: [{ rentalOfferId: offerId, quantity: 1 }],
      fulfillmentMethod: 'PICKUP',
    };
  }

  function post(client: E2ETestClient) {
    return client
      .withCsrf(client.request().post('/rental-commitments/confirmed-rentals'))
      .set('idempotency-key', randomUUID());
  }

  async function expectNoCommitment(setup: Awaited<ReturnType<typeof scenario>>) {
    const rentals = await prisma.client.v2Rental.findMany({
      where: { tenantId: setup.tenant.id, branchId: setup.branch.id, customerId: setup.customer.customer.id },
      include: { selections: true, demandLines: true, assignedAssets: true, ownerSplits: true },
    });
    expect(rentals).toHaveLength(0);
  }

  it('returns a dedicated semantic error for duplicate offer IDs', async () => {
    const setup = await scenario();
    const client = await login(setup);
    const response = await post(client).send({
      ...body(setup),
      selectedOffers: [
        { rentalOfferId: setup.catalog.offer.id, quantity: 1 },
        { rentalOfferId: setup.catalog.offer.id, quantity: 1 },
      ],
    });
    expectProblemResponse(response, {
      status: 422,
      type: createProblemType('rental_commitment.duplicate_rental_offer_selection'),
      code: 'rental_commitment.duplicate_rental_offer_selection',
    });
    await expectNoCommitment(setup);
  });

  it('creates a complete confirmed rental for an authenticated customer', async () => {
    const setup = await scenario();
    const assetId = await rentalFixtures.createCandidate({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      equipmentTypeId: setup.catalog.equipmentType.id,
    });
    const client = await login(setup);

    const response = await post(client).send(body(setup)).expect(201);
    expect(response.body).toEqual({ data: { rentalNumber: expect.any(Number) } });
    expect(response.body.data.rentalNumber).toBeGreaterThan(0);

    const rental = await prisma.client.v2Rental.findFirstOrThrow({
      where: {
        tenantId: setup.tenant.id,
        rentalNumber: response.body.data.rentalNumber as number,
      },
      include: { selections: true, demandLines: true, assignedAssets: true, ownerSplits: true },
    });
    expect(rental.status).toBe('CONFIRMED');
    expect(rental.confirmedAt).not.toBeNull();
    expect(rental.selections).toHaveLength(1);
    expect(rental.demandLines).toHaveLength(1);
    expect(rental.assignedAssets).toEqual([expect.objectContaining({ assetId })]);
  });

  it('requires authentication', async () => {
    const setup = await scenario();
    const client = createE2ETestClient(testApp.app);
    await client.getCsrfToken();
    const response = await post(client).send(body(setup));
    expectProblemResponse(response, { status: 401, type: PlatformProblemTypes.auth.unauthorized });
    await expectNoCommitment(setup);
  });

  it.each([
    ['missing', undefined],
    ['invalid', 'invalid-token'],
  ])('rejects an authenticated request with a %s CSRF token', async (_name, token) => {
    const setup = await scenario();
    const client = await login(setup);
    let request = client
      .request()
      .post('/rental-commitments/confirmed-rentals')
      .set('idempotency-key', randomUUID())
      .send(body(setup));
    if (token) request = request.set('x-csrf-token', token);
    const response = await request;
    expectProblemResponse(response, { status: 403, type: PlatformProblemTypes.auth.forbidden });
    await expectNoCommitment(setup);
  });

  it('returns request validation Problem Details for malformed input', async () => {
    const setup = await scenario();
    const client = await login(setup);
    const response = await post(client).send({
      ...body(setup),
      selectedOffers: [{ rentalOfferId: setup.catalog.offer.id, quantity: 0 }],
    });
    expectProblemResponse(response, { status: 400, type: PlatformProblemTypes.request.validationFailed });
    await expectNoCommitment(setup);
  });

  it('returns a safe not-found response for a real foreign-tenant offer', async () => {
    const setupA = await scenario();
    const setupB = await scenario();
    const client = await login(setupA);
    const response = await post(client).send(body(setupA, setupB.catalog.offer.id));
    expectProblemResponse(response, {
      status: 404,
      type: createProblemType('rental_commitment.rental_offer_not_found'),
      code: 'rental_commitment.rental_offer_not_found',
    });
    await expectNoCommitment(setupA);
  });

  it('returns the same safe not-found response for a real wrong-branch offer', async () => {
    const setup = await scenario();
    const otherBranch = await core.createBranch({ tenantId: setup.tenant.id });
    const wrongBranchOffer = await catalogFixtures.createOffer({ tenantId: setup.tenant.id, branchId: otherBranch.id });
    const client = await login(setup);
    const response = await post(client).send(body(setup, wrongBranchOffer.offer.id));
    expectProblemResponse(response, {
      status: 404,
      type: createProblemType('rental_commitment.rental_offer_not_found'),
      code: 'rental_commitment.rental_offer_not_found',
    });
    await expectNoCommitment(setup);
  });

  it('returns an availability conflict and leaves no partial state', async () => {
    const setup = await scenario();
    const client = await login(setup);
    const response = await post(client).send(body(setup));
    expectProblemResponse(response, {
      status: 409,
      type: createProblemType('rental_commitment.insufficient_asset_availability'),
      code: 'rental_commitment.insufficient_asset_availability',
    });
    await expectNoCommitment(setup);
    expect(await prisma.client.v2AssignedAsset.count({ where: { tenantId: setup.tenant.id } })).toBe(0);
    expect(await prisma.client.v2RentalOwnerSplit.count({ where: { tenantId: setup.tenant.id } })).toBe(0);
  });

  it('does not disclose a random unknown offer', async () => {
    const setup = await scenario();
    const client = await login(setup);
    const response = await post(client).send(body(setup, randomUUID()));
    expectProblemResponse(response, {
      status: 404,
      type: createProblemType('rental_commitment.rental_offer_not_found'),
      code: 'rental_commitment.rental_offer_not_found',
    });
  });

  describe('idempotency key', () => {
    it('rejects a missing Idempotency-Key header with Problem Details', async () => {
      const setup = await scenario();
      const client = await login(setup);
      const response = await client
        .withCsrf(client.request().post('/rental-commitments/confirmed-rentals'))
        .send(body(setup));
      expectProblemResponse(response, {
        status: 400,
        type: createProblemType('rental_commitment.invalid_idempotency_key'),
        code: 'rental_commitment.invalid_idempotency_key',
      });
      await expectNoCommitment(setup);
    });

    it('rejects a malformed Idempotency-Key header with Problem Details', async () => {
      const setup = await scenario();
      const client = await login(setup);
      const response = await post(client).set('idempotency-key', 'not-a-uuid').send(body(setup));
      expectProblemResponse(response, {
        status: 400,
        type: createProblemType('rental_commitment.invalid_idempotency_key'),
        code: 'rental_commitment.invalid_idempotency_key',
      });
      await expectNoCommitment(setup);
    });

    it('returns the same rental for a retry with the same key and body', async () => {
      const setup = await scenario();
      await rentalFixtures.createCandidate({
        tenantId: setup.tenant.id,
        branchId: setup.branch.id,
        equipmentTypeId: setup.catalog.equipmentType.id,
      });
      const client = await login(setup);
      const idempotencyKey = randomUUID();

      const first = await post(client).set('idempotency-key', idempotencyKey).send(body(setup)).expect(201);
      const second = await post(client).set('idempotency-key', idempotencyKey).send(body(setup)).expect(201);

      expect(second.body).toEqual(first.body);
      const rentals = await prisma.client.v2Rental.findMany({
        where: { tenantId: setup.tenant.id, confirmationOperationId: idempotencyKey },
      });
      expect(rentals).toHaveLength(1);
      expect(rentals[0].rentalNumber).toBe(first.body.data.rentalNumber);
    });

    it('conflicts when the same key is reused with a different body', async () => {
      const setup = await scenario();
      await rentalFixtures.createCandidate({
        tenantId: setup.tenant.id,
        branchId: setup.branch.id,
        equipmentTypeId: setup.catalog.equipmentType.id,
      });
      const client = await login(setup);
      const idempotencyKey = randomUUID();

      await post(client).set('idempotency-key', idempotencyKey).send(body(setup)).expect(201);
      const conflict = await post(client)
        .set('idempotency-key', idempotencyKey)
        .send({ ...body(setup), insuranceSelected: true })
        .expect(409);

      expectProblemResponse(conflict, {
        status: 409,
        type: createProblemType('rental_commitment.idempotency_key_reused_with_different_input'),
        code: 'rental_commitment.idempotency_key_reused_with_different_input',
      });
      expect(
        await prisma.client.v2Rental.count({
          where: { tenantId: setup.tenant.id, confirmationOperationId: idempotencyKey },
        }),
      ).toBe(1);
    });
  });
});

function storefrontTenantContext(tenant: { id: string; slug: string }) {
  const canonicalHost = `${tenant.slug}.localhost`;

  return { tenantId: tenant.id, canonicalHost };
}
