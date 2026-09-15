import { randomUUID } from 'node:crypto';

import { TenantPermission, type TenantPermission as TenantPermissionId } from '@repo/api-contracts';

import { PrismaService } from '../../src/core/database/prisma.service';
import type { E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, type E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, type TestFixtures } from '../support/fixtures';

describe('Asset Inventory HTTP authorization', () => {
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
        name: `Restricted inventory role ${unique}`,
        permissions: { create: permissions.map((permission) => ({ permission })) },
      },
    });
    const tenantUser = await fixtures.createTenantUserWithRole({ tenantId, roleId: role.id });
    const client = createE2ETestClient(app.app);
    await client.loginTenantUser({ email: tenantUser.user.email, password: tenantUser.password });
    return client;
  }

  it('enforces inventory.read on a standalone inventory read', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.InventoryRead]);
    const denied = await clientWithPermissions(tenant.id, []);

    const path = `/asset-inventory/asset-summaries?ids=${randomUUID()}`;

    await allowed.request().get(path).expect(200);
    await denied.request().get(path).expect(403);
  });

  it('allows inventory and rental workflows to use their supporting reads', async () => {
    const tenant = await fixtures.createTenant();
    const inventoryManager = await clientWithPermissions(tenant.id, [TenantPermission.InventoryManage]);
    const rentalReader = await clientWithPermissions(tenant.id, [TenantPermission.RentalsRead]);

    await inventoryManager.request().get('/asset-inventory/equipment-type-options').expect(200);
    await rentalReader.request().get(`/asset-inventory/asset-summaries?ids=${randomUUID()}`).expect(200);
  });

  it('allows independently authorized product authoring to use equipment-type options', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.ProductsManage]);

    await allowed.request().get('/asset-inventory/equipment-type-options').expect(200);
  });

  it('allows ownership management to use owner supporting reads', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.InventoryOwnershipManage]);

    await allowed.request().get('/asset-inventory/owners').expect(200);
  });

  it('enforces inventory.manage independently from inventory.read', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.InventoryManage]);
    const readOnly = await clientWithPermissions(tenant.id, [TenantPermission.InventoryRead]);
    const path = `/asset-inventory/assets/${randomUUID()}`;
    const body = { notes: 'Authorization boundary test' };

    await allowed.withCsrf(allowed.request().patch(path)).send(body).expect(404);
    await readOnly.withCsrf(readOnly.request().patch(path)).send(body).expect(403);
  });

  it('enforces inventory.ownership.manage independently from inventory.manage', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.InventoryOwnershipManage]);
    const inventoryManager = await clientWithPermissions(tenant.id, [TenantPermission.InventoryManage]);
    const path = `/asset-inventory/assets/${randomUUID()}/owner`;
    const body = { ownerId: null };

    await allowed.withCsrf(allowed.request().patch(path)).send(body).expect(404);
    await inventoryManager.withCsrf(inventoryManager.request().patch(path)).send(body).expect(403);
  });

  it('protects accessory-default management with inventory.manage', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.InventoryManage]);
    const readOnly = await clientWithPermissions(tenant.id, [TenantPermission.InventoryRead]);
    const path = `/asset-inventory/equipment-types/${randomUUID()}/accessory-defaults`;
    const body = { accessories: [] };

    await allowed.withCsrf(allowed.request().put(path)).send(body).expect(404);
    await readOnly.withCsrf(readOnly.request().put(path)).send(body).expect(403);
  });
});
