import { randomUUID } from 'node:crypto';

import { TenantPermission, type TenantPermission as TenantPermissionId } from '@repo/api-contracts';

import { PrismaService } from '../../src/core/database/prisma.service';
import type { E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, type E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, type TestFixtures } from '../support/fixtures';

describe('Catalog HTTP authorization', () => {
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
        name: `Restricted role ${unique}`,
        permissions: { create: permissions.map((permission) => ({ permission })) },
      },
    });
    const tenantUser = await fixtures.createTenantUserWithRole({ tenantId, roleId: role.id });
    const client = createE2ETestClient(app.app);
    await client.loginTenantUser({ email: tenantUser.user.email, password: tenantUser.password });
    return client;
  }

  it('enforces products.read on standalone catalog reads', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.ProductsRead]);
    const denied = await clientWithPermissions(tenant.id, []);

    await allowed.request().get('/catalog/rentable-items').expect(200);
    await denied.request().get('/catalog/rentable-items').expect(403);
  });

  it('allows rental proposal management to use rental-offer search', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.RentalsProposalsManage]);
    const denied = await clientWithPermissions(tenant.id, []);
    const path = `/catalog/rental-offers/search?branchId=${randomUUID()}`;

    await allowed.request().get(path).expect(200);
    await denied.request().get(path).expect(403);
  });

  it('enforces products.manage independently from products.read', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.ProductsManage]);
    const readOnly = await clientWithPermissions(tenant.id, [TenantPermission.ProductsRead]);
    const path = `/catalog/rentable-items/${randomUUID()}/archive`;

    await allowed.withCsrf(allowed.request().post(path)).expect(404);
    await readOnly.withCsrf(readOnly.request().post(path)).expect(403);
  });

  it('enforces products.availability.manage independently from products.manage', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.ProductsAvailabilityManage]);
    const productManager = await clientWithPermissions(tenant.id, [TenantPermission.ProductsManage]);
    const path = `/catalog/rental-offers/${randomUUID()}`;
    const body = { isVisible: false };

    await allowed.withCsrf(allowed.request().patch(path)).send(body).expect(404);
    await productManager.withCsrf(productManager.request().patch(path)).send(body).expect(403);
  });

  it('keeps storefront catalog discovery public', async () => {
    const tenant = await fixtures.createTenant();
    const client = createE2ETestClient(app.app);
    const request = client.request().get(`/storefront/catalog/rental-offers?branchId=${randomUUID()}`);

    await client.withStorefrontTenantContext(request, {
      tenantId: tenant.id,
      canonicalHost: `${tenant.slug}.localhost`,
    });

    await request.expect(200);
  });
});
