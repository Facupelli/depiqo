import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { randomUUID } from 'node:crypto';

import {
  TenantPermission,
  type CreateIndividualRentalBodyDto,
  type CreatePackageBodyDto,
  type CreateRentalOfferWithPricingBodyDto,
  type TenantPermission as TenantPermissionId,
} from '@repo/api-contracts';

import { PrismaService } from '../../src/core/database/prisma.service';
import type { E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, type E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, type TestFixtures } from '../support/fixtures';

type StaticAuthorizationRequestBody =
  | CreateIndividualRentalBodyDto
  | CreatePackageBodyDto
  | CreateRentalOfferWithPricingBodyDto;

type StaticAllAuthorizationCase = {
  name: string;
  path: string;
  firstPermission: TenantPermissionId;
  secondPermission: TenantPermissionId;
  body: () => StaticAuthorizationRequestBody;
};

const cases: readonly StaticAllAuthorizationCase[] = [
  {
    name: 'individual rentable product creation',
    path: '/catalog/rentable-items',
    firstPermission: TenantPermission.ProductsManage,
    secondPermission: TenantPermission.ProductsAvailabilityManage,
    body: () => ({
      equipmentTypeId: randomUUID(),
      name: 'Restricted role authorization test product',
      branchIds: [randomUUID()],
    }),
  },
  {
    name: 'package creation',
    path: '/offering-setup/packages',
    firstPermission: TenantPermission.ProductsManage,
    secondPermission: TenantPermission.ProductsAvailabilityManage,
    body: () => ({
      name: 'Restricted role authorization test package',
      branchIds: [randomUUID()],
      requirements: [{ equipmentTypeId: randomUUID(), quantityPerItem: 1 }],
    }),
  },
  {
    name: 'rental offer creation with pricing',
    path: '/offering-setup/rental-offers',
    firstPermission: TenantPermission.ProductsAvailabilityManage,
    secondPermission: TenantPermission.PricingManage,
    body: () => ({
      rentableItemId: randomUUID(),
      branchId: randomUUID(),
      pricing: { mode: 'REUSE_RATE_PLAN', ratePlanId: randomUUID() },
    }),
  },
];

describe('Static ALL-of HTTP authorization', () => {
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
        name: `Restricted ALL role ${unique}`,
        permissions: { create: permissions.map((permission) => ({ permission })) },
      },
    });
    const tenantUser = await fixtures.createTenantUserWithRole({ tenantId, roleId: role.id });
    const client = createE2ETestClient(app.app);
    await client.loginTenantUser({ email: tenantUser.user.email, password: tenantUser.password });
    return client;
  }

  it.each(cases)('requires both permissions for $name', async (testCase) => {
    const tenant = await fixtures.createTenant();
    const fullAuthority = await clientWithPermissions(tenant.id, [testCase.firstPermission, testCase.secondPermission]);
    const firstOnly = await clientWithPermissions(tenant.id, [testCase.firstPermission]);
    const secondOnly = await clientWithPermissions(tenant.id, [testCase.secondPermission]);
    const emptyRole = await clientWithPermissions(tenant.id, []);

    const authorizedResponse = await fullAuthority
      .withCsrf(fullAuthority.request().post(testCase.path))
      .send(testCase.body());

    expect([404, 409, 422]).toContain(authorizedResponse.status);

    await firstOnly.withCsrf(firstOnly.request().post(testCase.path)).send(testCase.body()).expect(403);
    await secondOnly.withCsrf(secondOnly.request().post(testCase.path)).send(testCase.body()).expect(403);
    await emptyRole.withCsrf(emptyRole.request().post(testCase.path)).send(testCase.body()).expect(403);
  });
});
