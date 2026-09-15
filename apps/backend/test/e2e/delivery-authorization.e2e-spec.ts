import { randomUUID } from 'node:crypto';

import { TenantPermission, type TenantPermission as TenantPermissionId } from '@repo/api-contracts';

import { PrismaService } from '../../src/core/database/prisma.service';
import type { E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, type E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, type TestFixtures } from '../support/fixtures';

describe('Delivery HTTP authorization', () => {
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
        name: `Restricted delivery role ${unique}`,
        permissions: { create: permissions.map((permission) => ({ permission })) },
      },
    });
    const tenantUser = await fixtures.createTenantUserWithRole({ tenantId, roleId: role.id });
    const client = createE2ETestClient(app.app);
    await client.loginTenantUser({ email: tenantUser.user.email, password: tenantUser.password });
    return client;
  }

  it('enforces branches.manage on GET branch delivery configuration', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.BranchesManage]);
    const denied = await clientWithPermissions(tenant.id, [TenantPermission.ProductsRead]);
    const path = `/delivery/branches/${randomUUID()}/configuration`;

    await allowed.request().get(path).expect(404);
    await denied.request().get(path).expect(403);
  });

  it('enforces branches.manage on PUT branch delivery configuration', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.BranchesManage]);
    const denied = await clientWithPermissions(tenant.id, [TenantPermission.ProductsRead]);
    const path = `/delivery/branches/${randomUUID()}/configuration`;
    const body = {
      enabled: true,
      currency: 'USD',
      maximumDistanceMeters: 50_000,
      eligibleWeekdays: [1, 2, 3, 4, 5],
      eligibilityStartMinute: 480,
      eligibilityEndMinute: 1_080,
      normalServiceStartMinute: 540,
      normalServiceEndMinute: 1_020,
      specialHoursSurcharge: '10',
      transportReservationMinutes: 60,
      distancePriceBands: [{ maxDistanceMeters: 50_000, price: '25' }],
    };

    await allowed.withCsrf(allowed.request().put(path)).send(body).expect(404);
    await denied.withCsrf(denied.request().put(path)).send(body).expect(403);
  });
});
