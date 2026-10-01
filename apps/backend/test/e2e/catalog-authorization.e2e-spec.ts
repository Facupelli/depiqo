import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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
    const missingRestore = path.replace('/archive', '/restore');
    await allowed.withCsrf(allowed.request().post(missingRestore)).expect(404);
    await readOnly.withCsrf(readOnly.request().post(missingRestore)).expect(403);

    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    const hiddenBranch = await fixtures.createBranch({ tenantId: tenant.id });
    const previouslyPublishedBranch = await fixtures.createBranch({ tenantId: tenant.id });
    const equipmentType = await prisma.client.v2EquipmentType.create({
      data: { tenantId: tenant.id, name: `Equipment ${randomUUID()}` },
    });
    const item = await prisma.client.v2RentableItem.create({
      data: {
        tenantId: tenant.id,
        name: `Item ${randomUUID()}`,
        kind: 'SINGLE',
        requirements: { create: { tenantId: tenant.id, equipmentTypeId: equipmentType.id, quantityPerItem: 1 } },
      },
    });
    const priorPublication = new Date('2023-06-01T12:00:00Z');
    const [shown, hidden, published] = await Promise.all([
      prisma.client.v2RentalOffer.create({
        data: {
          tenantId: tenant.id,
          rentableItemId: item.id,
          branchId: branch.id,
          showInStore: true,
          isRentable: true,
        },
      }),
      prisma.client.v2RentalOffer.create({
        data: { tenantId: tenant.id, rentableItemId: item.id, branchId: hiddenBranch.id },
      }),
      prisma.client.v2RentalOffer.create({
        data: {
          tenantId: tenant.id,
          rentableItemId: item.id,
          branchId: previouslyPublishedBranch.id,
          showInStore: true,
          firstPublishedAt: priorPublication,
        },
      }),
    ]);
    const itemPath = `/catalog/rentable-items/${item.id}`;
    const archivePath = `${itemPath}/archive`;
    const restorePath = `${itemPath}/restore`;
    const foreign = await clientWithPermissions((await fixtures.createTenant()).id, [TenantPermission.ProductsManage]);
    await foreign.withCsrf(foreign.request().post(restorePath)).expect(404);
    await allowed.withCsrf(allowed.request().post(archivePath)).expect(204);
    const firstArchive = (await prisma.client.v2RentableItem.findUniqueOrThrow({ where: { id: item.id } })).archivedAt;
    expect(firstArchive).toBeInstanceOf(Date);
    await allowed.withCsrf(allowed.request().post(archivePath)).expect(204);
    expect((await prisma.client.v2RentableItem.findUniqueOrThrow({ where: { id: item.id } })).archivedAt).toEqual(
      firstArchive,
    );
    await allowed.withCsrf(allowed.request().patch(itemPath)).send({ name: 'Edited while archived' }).expect(204);
    const beforeRestore = new Date();
    await allowed.withCsrf(allowed.request().post(restorePath)).expect(204);
    const afterRestore = new Date();
    const firstPublication = (await prisma.client.v2RentalOffer.findUniqueOrThrow({ where: { id: shown.id } }))
      .firstPublishedAt;
    await allowed.withCsrf(allowed.request().post(restorePath)).expect(204);
    expect((await prisma.client.v2RentalOffer.findUniqueOrThrow({ where: { id: shown.id } })).firstPublishedAt).toEqual(
      firstPublication,
    );
    expect(await prisma.client.v2RentableItem.findUniqueOrThrow({ where: { id: item.id } })).toEqual(
      expect.objectContaining({ name: 'Edited while archived', archivedAt: null }),
    );
    expect(await prisma.client.v2RentableItemRequirement.count({ where: { rentableItemId: item.id } })).toBe(1);
    const restoredShown = await prisma.client.v2RentalOffer.findUniqueOrThrow({ where: { id: shown.id } });
    expect(restoredShown).toEqual(expect.objectContaining({ showInStore: true, isRentable: true }));
    expect(restoredShown.firstPublishedAt?.getTime()).toBeGreaterThanOrEqual(beforeRestore.getTime());
    expect(restoredShown.firstPublishedAt?.getTime()).toBeLessThanOrEqual(afterRestore.getTime());
    expect(
      (await prisma.client.v2RentalOffer.findUniqueOrThrow({ where: { id: hidden.id } })).firstPublishedAt,
    ).toBeNull();
    expect(
      (await prisma.client.v2RentalOffer.findUniqueOrThrow({ where: { id: published.id } })).firstPublishedAt,
    ).toEqual(priorPublication);
    await allowed.withCsrf(allowed.request().post(archivePath)).expect(204);
    await allowed.withCsrf(allowed.request().post(restorePath)).expect(204);
    expect((await prisma.client.v2RentalOffer.findUniqueOrThrow({ where: { id: shown.id } })).firstPublishedAt).toEqual(
      firstPublication,
    );
  });

  it('enforces products.availability.manage independently from products.manage', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.ProductsAvailabilityManage]);
    const productManager = await clientWithPermissions(tenant.id, [TenantPermission.ProductsManage]);
    const path = `/catalog/rental-offers/${randomUUID()}`;
    const body = { isVisible: false };

    await allowed.withCsrf(allowed.request().patch(path)).send(body).expect(404);
    await productManager.withCsrf(productManager.request().patch(path)).send(body).expect(403);

    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    const item = await prisma.client.v2RentableItem.create({
      data: { tenantId: tenant.id, name: `Offer settings ${randomUUID()}`, kind: 'SINGLE' },
    });
    const offer = await prisma.client.v2RentalOffer.create({
      data: { tenantId: tenant.id, rentableItemId: item.id, branchId: branch.id },
    });
    const offerPath = `/catalog/rental-offers/${offer.id}`;
    const foreign = await clientWithPermissions((await fixtures.createTenant()).id, [
      TenantPermission.ProductsAvailabilityManage,
    ]);
    await foreign.withCsrf(foreign.request().patch(offerPath)).send({ isVisible: true }).expect(404);

    await allowed.withCsrf(allowed.request().patch(offerPath)).send({ isRentable: true }).expect(204);
    expect(await prisma.client.v2RentalOffer.findUniqueOrThrow({ where: { id: offer.id } })).toEqual(
      expect.objectContaining({ showInStore: false, isRentable: true, firstPublishedAt: null }),
    );

    await allowed.withCsrf(allowed.request().patch(offerPath)).send({ isVisible: true }).expect(204);
    const published = await prisma.client.v2RentalOffer.findUniqueOrThrow({ where: { id: offer.id } });
    expect(published).toEqual(
      expect.objectContaining({ showInStore: true, isRentable: true, firstPublishedAt: expect.any(Date) }),
    );
    await allowed.withCsrf(allowed.request().patch(offerPath)).send({ isVisible: false }).expect(204);
    await allowed.withCsrf(allowed.request().patch(offerPath)).send({ isVisible: true }).expect(204);
    expect((await prisma.client.v2RentalOffer.findUniqueOrThrow({ where: { id: offer.id } })).firstPublishedAt).toEqual(
      published.firstPublishedAt,
    );

    await prisma.client.v2RentableItem.update({ where: { id: item.id }, data: { archivedAt: new Date() } });
    const archivedBranch = await fixtures.createBranch({ tenantId: tenant.id });
    const archivedOffer = await prisma.client.v2RentalOffer.create({
      data: { tenantId: tenant.id, rentableItemId: item.id, branchId: archivedBranch.id },
    });
    await allowed
      .withCsrf(allowed.request().patch(`/catalog/rental-offers/${archivedOffer.id}`))
      .send({ isVisible: true, isRentable: true })
      .expect(204);
    expect(await prisma.client.v2RentalOffer.findUniqueOrThrow({ where: { id: archivedOffer.id } })).toEqual(
      expect.objectContaining({ showInStore: true, isRentable: true, firstPublishedAt: null }),
    );
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
