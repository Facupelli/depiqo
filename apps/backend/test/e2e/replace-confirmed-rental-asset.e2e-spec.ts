import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../src/core/database/prisma.service';
import { PlatformProblemTypes, createProblemType } from '../../src/core/problem-details';
import { ConfirmedRentalFixtures } from '../../src/modules/rental-commitment/testing/confirmed-rental.fixtures';
import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, TestFixtures } from '../support/fixtures';
import { expectProblemResponse } from '../support/problem-response';
import { utcDate } from '../support/time';

describe('POST /rental-commitments/confirmed-rentals/:rentalId/assigned-assets/replace', () => {
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

  async function scenario(period = { start: utcDate(2030, 1, 1, 10), end: utcDate(2030, 1, 1, 12) }) {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const user = await core.createTenantUser({ tenantId: tenant.id });
    const commercial = await fixtures.createOffer({ tenantId: tenant.id, branchId: branch.id });
    const rental = await fixtures.createConfirmedRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period,
      offerId: commercial.offer.id,
      equipmentTypeId: commercial.equipmentType.id,
    });
    const replacementAssetId = await fixtures.createCandidate({
      tenantId: tenant.id,
      branchId: branch.id,
      equipmentTypeId: commercial.equipmentType.id,
    });
    const persisted = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    return { tenant, branch, customer, user, commercial, rental, replacementAssetId, persisted };
  }

  async function login(user: Awaited<ReturnType<TestFixtures['createTenantUser']>>): Promise<E2ETestClient> {
    const client = createE2ETestClient(testApp.app);
    await client.loginTenantUser({ email: user.user.email, password: user.password });
    return client;
  }

  function body(setup: Awaited<ReturnType<typeof scenario>>, overrides: Record<string, unknown> = {}) {
    return {
      expectedVersion: setup.persisted.version,
      currentAssignedAssetId: setup.rental.assetIds[0],
      replacementAssetId: setup.replacementAssetId,
      ...overrides,
    };
  }

  it('replaces an asset through the authenticated route and persists one coherent assignment and block', async () => {
    const setup = await scenario();
    const client = await login(setup.user);
    const response = await client
      .withCsrf(
        client.request().post(`/rental-commitments/confirmed-rentals/${setup.rental.rentalId}/assigned-assets/replace`),
      )
      .send(body(setup))
      .expect(201);
    expect(response.body).toEqual({
      data: { id: setup.rental.rentalId, version: expect.any(Number), updatedAt: expect.any(String) },
    });
    const state = await fixtures.persistedState(setup.rental.rentalId);
    expect(state.rental.status).toBe('CONFIRMED');
    expect(state.rental.assignedAssets).toEqual([expect.objectContaining({ assetId: setup.replacementAssetId })]);
    expect(state.blocks.filter((block) => block.releasedAt === null)).toEqual([
      expect.objectContaining({ assetId: setup.replacementAssetId }),
    ]);
  });

  it('replaces an asset through the route after the rental has started', async () => {
    const now = Date.now();
    const setup = await scenario({
      start: new Date(now - 2 * 60 * 60 * 1000),
      end: new Date(now + 2 * 60 * 60 * 1000),
    });
    const client = await login(setup.user);
    await client
      .withCsrf(
        client.request().post(`/rental-commitments/confirmed-rentals/${setup.rental.rentalId}/assigned-assets/replace`),
      )
      .send(body(setup))
      .expect(201);

    const state = await fixtures.persistedState(setup.rental.rentalId);
    const closedAssignment = state.rental.assignedAssets.find((asset) => asset.assetId === setup.rental.assetIds[0])!;
    const replacementAssignment = state.rental.assignedAssets.find(
      (asset) => asset.assetId === setup.replacementAssetId,
    )!;
    const closedBlock = state.blocks.find((block) => block.assetId === setup.rental.assetIds[0])!;
    expect(closedAssignment.effectiveUntil).toEqual(replacementAssignment.effectiveFrom);
    expect(closedBlock.releasedAt).toBeNull();
    expect(replacementAssignment.effectiveUntil).toBeNull();
  });

  it('requires authentication', async () => {
    const client = createE2ETestClient(testApp.app);
    await client.getCsrfToken();
    const response = await client
      .withCsrf(client.request().post(`/rental-commitments/confirmed-rentals/${randomUUID()}/assigned-assets/replace`))
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
      .post(`/rental-commitments/confirmed-rentals/${setup.rental.rentalId}/assigned-assets/replace`)
      .send(body(setup));
    if (token) request = request.set('x-csrf-token', token);
    const response = await request;
    expectProblemResponse(response, { status: 403, type: PlatformProblemTypes.auth.forbidden });
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it.each([
    ['missing expectedVersion', { expectedVersion: undefined }],
    ['negative expectedVersion', { expectedVersion: -1 }],
    ['non-integer expectedVersion', { expectedVersion: 1.5 }],
    ['blank currentAssignedAssetId', { currentAssignedAssetId: '   ' }],
    ['blank replacementAssetId', { replacementAssetId: '' }],
  ])('validates %s without mutation', async (_name, overrides) => {
    const setup = await scenario();
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const requestBody = body(setup, overrides);
    if (overrides.expectedVersion === undefined) delete (requestBody as Record<string, unknown>).expectedVersion;
    const client = await login(setup.user);
    const response = await client
      .withCsrf(
        client.request().post(`/rental-commitments/confirmed-rentals/${setup.rental.rentalId}/assigned-assets/replace`),
      )
      .send(requestBody);
    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });

  it('does not disclose or mutate a real foreign-tenant rental', async () => {
    const tenantA = await core.createTenant();
    const userA = await core.createTenantUser({ tenantId: tenantA.id });
    const setupB = await scenario();
    const before = await fixtures.persistedState(setupB.rental.rentalId);
    const client = await login(userA);
    const response = await client
      .withCsrf(
        client
          .request()
          .post(`/rental-commitments/confirmed-rentals/${setupB.rental.rentalId}/assigned-assets/replace`),
      )
      .send(body(setupB));
    expectProblemResponse(response, {
      status: 404,
      type: createProblemType('rental_commitment.rental_not_found'),
      code: 'rental_commitment.rental_not_found',
    });
    expect(await fixtures.persistedState(setupB.rental.rentalId)).toEqual(before);
  });

  it('cannot use a real foreign-tenant replacement asset', async () => {
    const setupA = await scenario();
    const setupB = await scenario();
    const beforeA = await fixtures.persistedState(setupA.rental.rentalId);
    const beforeB = await fixtures.persistedState(setupB.rental.rentalId);
    const client = await login(setupA.user);
    const response = await client
      .withCsrf(
        client
          .request()
          .post(`/rental-commitments/confirmed-rentals/${setupA.rental.rentalId}/assigned-assets/replace`),
      )
      .send(body(setupA, { replacementAssetId: setupB.replacementAssetId }));
    expectProblemResponse(response, {
      status: 409,
      type: createProblemType('rental_commitment.replacement_asset_unavailable'),
      code: 'rental_commitment.replacement_asset_unavailable',
    });
    expect(await fixtures.persistedState(setupA.rental.rentalId)).toEqual(beforeA);
    expect(await fixtures.persistedState(setupB.rental.rentalId)).toEqual(beforeB);
  });

  it('returns a conflict and preserves complete state when the replacement candidate is unavailable', async () => {
    const setup = await scenario();
    const competing = await fixtures.createConfirmedRental({
      tenantId: setup.tenant.id,
      branchId: setup.branch.id,
      customerId: setup.customer.id,
      period: { start: utcDate(2030, 1, 1, 11), end: utcDate(2030, 1, 1, 13) },
      offerId: setup.commercial.offer.id,
      equipmentTypeId: setup.commercial.equipmentType.id,
      assetId: setup.replacementAssetId,
    });
    const beforeTarget = await fixtures.persistedState(setup.rental.rentalId);
    const beforeCompeting = await fixtures.persistedState(competing.rentalId);
    const client = await login(setup.user);
    const response = await client
      .withCsrf(
        client.request().post(`/rental-commitments/confirmed-rentals/${setup.rental.rentalId}/assigned-assets/replace`),
      )
      .send(body(setup));
    expectProblemResponse(response, {
      status: 409,
      type: createProblemType('rental_commitment.replacement_asset_unavailable'),
      code: 'rental_commitment.replacement_asset_unavailable',
    });
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(beforeTarget);
    expect(await fixtures.persistedState(competing.rentalId)).toEqual(beforeCompeting);
  });

  it('returns the documented conflict without mutation for a stale expectedVersion', async () => {
    const setup = await scenario();
    await prisma.client.v2Rental.update({
      where: { id: setup.rental.rentalId },
      data: { notes: 'concurrent change', version: { increment: 1 } },
    });
    const before = await fixtures.persistedState(setup.rental.rentalId);
    const client = await login(setup.user);
    const response = await client
      .withCsrf(
        client.request().post(`/rental-commitments/confirmed-rentals/${setup.rental.rentalId}/assigned-assets/replace`),
      )
      .send(body(setup));
    expectProblemResponse(response, {
      status: 409,
      type: createProblemType('rental_commitment.rental_version_conflict'),
      code: 'rental_commitment.rental_version_conflict',
    });
    expect(response.body.title).toBe('Rental was modified');
    expect(await fixtures.persistedState(setup.rental.rentalId)).toEqual(before);
  });
});
