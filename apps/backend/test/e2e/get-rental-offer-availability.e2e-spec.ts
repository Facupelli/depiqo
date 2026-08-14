import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../src/core/database/prisma.service';
import { createProblemType, PlatformProblemTypes } from '../../src/core/problem-details';
import { ConfirmRentalFixtures } from '../../src/modules/rental-commitment/features/confirm-rental/testing/confirm-rental.fixtures';
import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, TestFixtures } from '../support/fixtures';
import { expectProblemResponse, expectValidationProblem } from '../support/problem-response';
import { utcDate } from '../support/time';

const path = '/rental-commitment/rental-offers/availability';
const periodStart = utcDate(2030, 1, 1, 10);
const periodEnd = utcDate(2030, 1, 1, 12);

describe(`POST ${path}`, () => {
  let app: E2ETestApp;
  let prisma: PrismaService;
  let core: TestFixtures;
  let rentals: ConfirmRentalFixtures;

  beforeAll(async () => {
    app = await createE2ETestApp();
    prisma = app.app.get(PrismaService);
    core = createTestFixtures(prisma);
    rentals = new ConfirmRentalFixtures(prisma);
  });
  afterAll(async () => app?.close());

  async function scenario() {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const user = await core.createTenantUser({ tenantId: tenant.id });
    const equipmentType = await prisma.client.v2EquipmentType.create({
      data: { tenantId: tenant.id, name: `Type ${randomUUID()}` },
    });
    const item = await prisma.client.v2RentableItem.create({
      data: {
        tenantId: tenant.id,
        name: `Item ${randomUUID()}`,
        kind: 'SINGLE',
        status: 'ACTIVE',
        requirements: { create: { tenantId: tenant.id, equipmentTypeId: equipmentType.id, quantityPerItem: 1 } },
      },
    });
    const offer = await prisma.client.v2RentalOffer.create({
      data: { tenantId: tenant.id, branchId: branch.id, rentableItemId: item.id },
    });
    return { tenant, branch, user, equipmentType, offer };
  }

  async function login(user: Awaited<ReturnType<TestFixtures['createTenantUser']>>) {
    const client = createE2ETestClient(app.app);
    await client.loginTenantUser({ email: user.user.email, password: user.password });
    return client;
  }

  function body(branchId: string, rentalOfferIds: string[]) {
    return { branchId, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString(), rentalOfferIds };
  }

  it('returns the authenticated capacity response and has no persistence side effects', async () => {
    const s = await scenario();
    await rentals.createCandidate({
      tenantId: s.tenant.id,
      branchId: s.branch.id,
      equipmentTypeId: s.equipmentType.id,
    });
    const client = await login(s.user);
    const before = await counts();
    const response = await client
      .withCsrf(client.request().post(path))
      .send(body(s.branch.id, [s.offer.id]))
      .expect(200);
    expect(response.body).toEqual({ data: [{ rentalOfferId: s.offer.id, availableCount: 1 }] });
    expect(await counts()).toEqual(before);
  });

  it('enforces authentication', async () => {
    const client = createE2ETestClient(app.app);
    await client.getCsrfToken();
    const response = await client.withCsrf(client.request().post(path)).send(body(randomUUID(), [randomUUID()]));
    expectProblemResponse(response, { status: 401, type: PlatformProblemTypes.auth.unauthorized });
  });

  it.each([
    ['missing', undefined],
    ['invalid', 'invalid-token'],
  ])('rejects a %s CSRF token', async (_name, token) => {
    const s = await scenario();
    const client = await login(s.user);
    let request = client
      .request()
      .post(path)
      .send(body(s.branch.id, [s.offer.id]));
    if (token) request = request.set('x-csrf-token', token);
    expectProblemResponse(await request, { status: 403, type: PlatformProblemTypes.auth.forbidden });
  });

  it.each([
    ['empty IDs', (s: Awaited<ReturnType<typeof scenario>>) => body(s.branch.id, [])],
    ['duplicate IDs', (s: Awaited<ReturnType<typeof scenario>>) => body(s.branch.id, [s.offer.id, s.offer.id])],
    [
      'malformed date',
      (s: Awaited<ReturnType<typeof scenario>>) => ({ ...body(s.branch.id, [s.offer.id]), periodStart: 'bad' }),
    ],
  ])('rejects %s', async (_name, makeBody) => {
    const s = await scenario();
    const client = await login(s.user);
    expectValidationProblem(await client.withCsrf(client.request().post(path)).send(makeBody(s)));
  });

  it('rejects an invalid period', async () => {
    const s = await scenario();
    const client = await login(s.user);
    const response = await client
      .withCsrf(client.request().post(path))
      .send({ ...body(s.branch.id, [s.offer.id]), periodEnd: periodStart.toISOString() });
    expectProblemResponse(response, {
      status: 422,
      type: createProblemType('rental-commitment/invalid-rental-period'),
    });
  });

  it('does not disclose a real foreign-tenant offer', async () => {
    const actor = await scenario();
    const foreign = await scenario();
    const client = await login(actor.user);
    const response = await client.withCsrf(client.request().post(path)).send(body(actor.branch.id, [foreign.offer.id]));
    expectProblemResponse(response, {
      status: 404,
      type: createProblemType('rental_commitment.rental_offer_not_found'),
      code: 'rental_commitment.rental_offer_not_found',
    });
  });

  it('returns zero capacity for representative unavailable inventory', async () => {
    const s = await scenario();
    const client = await login(s.user);
    const response = await client
      .withCsrf(client.request().post(path))
      .send(body(s.branch.id, [s.offer.id]))
      .expect(200);
    expect(response.body).toEqual({ data: [{ rentalOfferId: s.offer.id, availableCount: 0 }] });
  });

  async function counts() {
    const [rentalCount, assignments, candidates, blockRows] = await Promise.all([
      prisma.client.v2Rental.count(),
      prisma.client.v2AssignedAsset.count(),
      prisma.client.v2RentalAssetCandidate.count(),
      prisma.client.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM v2_asset_blocks`,
    ]);
    return { rentalCount, assignments, candidates, blocks: Number(blockRows[0].count) };
  }
});
