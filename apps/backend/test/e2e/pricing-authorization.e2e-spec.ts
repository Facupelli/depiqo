import { randomUUID } from 'node:crypto';

import { TenantPermission, type TenantPermission as TenantPermissionId } from '@repo/api-contracts';

import { PrismaService } from '../../src/core/database/prisma.service';
import type { E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, type E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, type TestFixtures } from '../support/fixtures';

describe('Pricing HTTP authorization', () => {
  let app: E2ETestApp;
  let prisma: PrismaService;
  let fixtures: TestFixtures;

  beforeAll(async () => {
    const { createE2ETestApp } = await import('../support/create-e2e-test-app');
    app = await createE2ETestApp();
    prisma = app.app.get(PrismaService);
    fixtures = createTestFixtures(prisma);
  });

  afterAll(async () => app?.close());

  async function clientWithPermissions(
    tenantId: string,
    permissions: readonly TenantPermissionId[],
  ): Promise<E2ETestClient> {
    const unique = randomUUID();
    const role = await prisma.client.v2TenantRole.create({
      data: {
        tenantId,
        name: `Restricted pricing role ${unique}`,
        permissions: { create: permissions.map((permission) => ({ permission })) },
      },
    });
    const tenantUser = await fixtures.createTenantUserWithRole({ tenantId, roleId: role.id });
    const client = createE2ETestClient(app.app);
    await client.loginTenantUser({ email: tenantUser.user.email, password: tenantUser.password });
    return client;
  }

  it('enforces pricing.read on a standalone pricing read', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.PricingRead]);
    const denied = await clientWithPermissions(tenant.id, []);

    await allowed.request().get('/pricing/rate-plans').expect(200);
    await denied.request().get('/pricing/rate-plans').expect(403);
  });

  it('allows pricing.manage to use pricing administration supporting reads', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.PricingManage]);

    await allowed.request().get('/pricing/rate-plans').expect(200);
    await allowed.request().get('/pricing/promotions').expect(200);
  });

  it('enforces pricing.manage independently from pricing.read', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.PricingManage]);
    const readOnly = await clientWithPermissions(tenant.id, [TenantPermission.PricingRead]);
    const path = `/pricing/rental-offer-pricings/${randomUUID()}`;

    await allowed.withCsrf(allowed.request().delete(path)).expect(404);
    await readOnly.withCsrf(readOnly.request().delete(path)).expect(403);
  });

  it('allows rental proposal management to calculate a draft rental price', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.RentalsProposalsManage]);
    const denied = await clientWithPermissions(tenant.id, []);
    const body = {
      branchId: randomUUID(),
      period: {
        start: '2027-01-01T10:00:00-03:00',
        end: '2027-01-02T10:00:00-03:00',
      },
      selectedOffers: [{ rentalOfferId: randomUUID(), quantity: 1 }],
    };

    await allowed.withCsrf(allowed.request().post('/pricing/draft-rentals/price')).send(body).expect(404);
    await denied.withCsrf(denied.request().post('/pricing/draft-rentals/price')).send(body).expect(403);
  });

  it('keeps storefront pricing public', async () => {
    const tenant = await fixtures.createTenant();
    const client = createE2ETestClient(app.app);
    const request = client.request().get(`/storefront/pricing/rental-offer-pricings?rentalOfferIds=${randomUUID()}`);

    await client.withStorefrontTenantContext(request, {
      tenantId: tenant.id,
      canonicalHost: `${tenant.slug}.localhost`,
    });

    await request.expect(200);
  });
});
