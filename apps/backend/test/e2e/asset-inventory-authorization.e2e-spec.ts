import { afterAll, beforeAll, describe, it } from 'vitest';

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

  it('conditionally requires product permissions when equipment creation includes a standalone rental', async () => {
    const tenant = await fixtures.createTenant();
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    const inventoryOnly = await clientWithPermissions(tenant.id, [TenantPermission.InventoryManage]);
    const productOnly = await clientWithPermissions(tenant.id, [
      TenantPermission.ProductsManage,
      TenantPermission.ProductsAvailabilityManage,
    ]);
    const fullyAllowed = await clientWithPermissions(tenant.id, [
      TenantPermission.InventoryManage,
      TenantPermission.ProductsManage,
      TenantPermission.ProductsAvailabilityManage,
    ]);
    const path = '/offering-setup/equipment';
    const equipment = { name: `Authorization equipment ${randomUUID()}` };
    const standaloneRental = {
      name: `Authorization product ${randomUUID()}`,
      branchIds: [branch.id],
    };

    await inventoryOnly.withCsrf(inventoryOnly.request().post(path)).send({ equipment }).expect(201);
    await inventoryOnly
      .withCsrf(inventoryOnly.request().post(path))
      .send({ equipment: { name: `${equipment.name} denied` }, standaloneRental })
      .expect(403);
    await fullyAllowed
      .withCsrf(fullyAllowed.request().post(path))
      .send({ equipment: { name: `${equipment.name} allowed` }, standaloneRental })
      .expect(201);
    await productOnly
      .withCsrf(productOnly.request().post(path))
      .send({ equipment: { name: `${equipment.name} no inventory` }, standaloneRental })
      .expect(403);
  });

  it('conditionally protects third-party ownership on equipment type creation', async () => {
    const tenant = await fixtures.createTenant();
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    const inventoryOnly = await clientWithPermissions(tenant.id, [TenantPermission.InventoryManage]);
    const ownershipOnly = await clientWithPermissions(tenant.id, [TenantPermission.InventoryOwnershipManage]);
    const fullyAllowed = await clientWithPermissions(tenant.id, [
      TenantPermission.InventoryManage,
      TenantPermission.InventoryOwnershipManage,
    ]);
    const path = '/asset-inventory/equipment-types';

    await inventoryOnly
      .withCsrf(inventoryOnly.request().post(path))
      .send({ name: `Tenant-owned ${randomUUID()}`, assets: [{ branchId: branch.id, ownerId: null }] })
      .expect(201);
    await inventoryOnly
      .withCsrf(inventoryOnly.request().post(path))
      .send({ name: `Third-party denied ${randomUUID()}`, assets: [{ branchId: branch.id, ownerId: randomUUID() }] })
      .expect(403);
    await fullyAllowed
      .withCsrf(fullyAllowed.request().post(path))
      .send({ name: `Third-party allowed ${randomUUID()}`, assets: [{ branchId: branch.id, ownerId: randomUUID() }] })
      .expect(404);
    await ownershipOnly
      .withCsrf(ownershipOnly.request().post(path))
      .send({ name: `No inventory ${randomUUID()}` })
      .expect(403);
  });

  it('conditionally protects third-party ownership when adding assets', async () => {
    const tenant = await fixtures.createTenant();
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    const inventoryOnly = await clientWithPermissions(tenant.id, [TenantPermission.InventoryManage]);
    const ownershipOnly = await clientWithPermissions(tenant.id, [TenantPermission.InventoryOwnershipManage]);
    const fullyAllowed = await clientWithPermissions(tenant.id, [
      TenantPermission.InventoryManage,
      TenantPermission.InventoryOwnershipManage,
    ]);
    const path = `/asset-inventory/equipment-types/${randomUUID()}/assets`;

    await inventoryOnly
      .withCsrf(inventoryOnly.request().post(path))
      .send({ assets: [{ branchId: branch.id }] })
      .expect(404);
    await inventoryOnly
      .withCsrf(inventoryOnly.request().post(path))
      .send({ assets: [{ branchId: branch.id, ownerId: randomUUID() }] })
      .expect(403);
    await fullyAllowed
      .withCsrf(fullyAllowed.request().post(path))
      .send({ assets: [{ branchId: branch.id, ownerId: randomUUID() }] })
      .expect(404);
    await ownershipOnly
      .withCsrf(ownershipOnly.request().post(path))
      .send({ assets: [{ branchId: branch.id }] })
      .expect(403);
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
