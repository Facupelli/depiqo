import { randomUUID } from 'node:crypto';

import { TenantPermission, type TenantPermission as TenantPermissionId } from '@repo/api-contracts';
import request from 'supertest';

import { PrismaService } from '../../src/core/database/prisma.service';
import type { E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, type E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, type TestFixtures } from '../support/fixtures';

describe('Tenant Management HTTP authorization', () => {
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
    const role = await prisma.client.v2TenantRole.create({
      data: {
        tenantId,
        name: `Restricted role ${randomUUID()}`,
        permissions: { create: permissions.map((permission) => ({ permission })) },
      },
    });
    const tenantUser = await fixtures.createTenantUserWithRole({ tenantId, roleId: role.id });
    const client = createE2ETestClient(app.app);
    await client.loginTenantUser({ email: tenantUser.user.email, password: tenantUser.password });
    return client;
  }

  it('enforces customers.read on standalone customer reads', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.CustomersRead]);
    const denied = await clientWithPermissions(tenant.id, []);

    await allowed.request().get('/tenant-management/rental-customers').expect(200);
    await denied.request().get('/tenant-management/rental-customers').expect(403);
  });

  it('allows rental proposal management to use the customer selector', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.RentalsProposalsManage]);

    await allowed.request().get('/tenant-management/rental-customers?isActive=true').expect(200);
  });

  it('enforces customer onboarding management independently from customer reads', async () => {
    const tenant = await fixtures.createTenant();
    const manager = await clientWithPermissions(tenant.id, [TenantPermission.CustomersOnboardingManage]);
    const reader = await clientWithPermissions(tenant.id, [TenantPermission.CustomersRead]);
    const path = `/tenant-management/rental-customers/${randomUUID()}/onboarding/reject`;

    await manager
      .withCsrf(manager.request().post(path))
      .send({ rejectionReason: 'Incomplete information' })
      .expect(404);
    await reader.withCsrf(reader.request().post(path)).send({ rejectionReason: 'Incomplete information' }).expect(403);
  });

  it('allows workflow roles to read branches and independently protects branch mutation', async () => {
    const tenant = await fixtures.createTenant();
    const workflowUser = await clientWithPermissions(tenant.id, [TenantPermission.RentalsProposalsManage]);
    const manager = await clientWithPermissions(tenant.id, [TenantPermission.BranchesManage]);
    const unrelated = await clientWithPermissions(tenant.id, [TenantPermission.CustomersRead]);

    await workflowUser.request().get('/tenant-management/branches').expect(200);
    await manager
      .withCsrf(manager.request().post('/tenant-management/branches'))
      .send({ name: `Authorized branch ${randomUUID()}` })
      .expect(201);
    await unrelated
      .withCsrf(unrelated.request().post('/tenant-management/branches'))
      .send({ name: `Forbidden branch ${randomUUID()}` })
      .expect(403);
  });

  it('protects storefront configuration while preserving public storefront reads', async () => {
    const tenant = await fixtures.createTenant();
    const manager = await clientWithPermissions(tenant.id, [TenantPermission.TenantStorefrontManage]);
    const unrelated = await clientWithPermissions(tenant.id, [TenantPermission.CustomersRead]);
    const body = {
      logoUrl: null,
      faviconUrl: null,
      primaryColor: null,
      accentColor: null,
      storefrontName: 'Authorized storefront',
      tagline: null,
    };

    await manager.withCsrf(manager.request().put('/tenant-management/tenant/branding')).send(body).expect(200);
    await unrelated.withCsrf(unrelated.request().put('/tenant-management/tenant/branding')).send(body).expect(403);

    const publicClient = createE2ETestClient(app.app);
    const publicRequest = publicClient.request().get('/storefront/tenant-management/tenant/config');
    await publicClient.withStorefrontTenantContext(publicRequest, {
      tenantId: tenant.id,
      canonicalHost: `${tenant.slug}.localhost`,
    });
    await publicRequest.expect(200);
  });

  it('requires the permission matching each tenant config field group', async () => {
    const tenant = await fixtures.createTenant();
    const settingsManager = await clientWithPermissions(tenant.id, [TenantPermission.TenantSettingsManage]);
    const storefrontManager = await clientWithPermissions(tenant.id, [TenantPermission.TenantStorefrontManage]);
    const pricingManager = await clientWithPermissions(tenant.id, [TenantPermission.PricingManage]);
    const unrelated = await clientWithPermissions(tenant.id, [TenantPermission.CustomersRead]);
    const path = '/tenant-management/tenant/config';
    const cases: Array<{ client: E2ETestClient; body: Record<string, unknown> }> = [
      { client: settingsManager, body: { timezone: 'UTC' } },
      { client: settingsManager, body: { notifications: { enabledChannels: ['EMAIL'] } } },
      { client: settingsManager, body: { communication: { orderCommunicationMode: 'FORMAL' } } },
      { client: settingsManager, body: { rentalAssetBuffer: { beforeBufferMinutes: 5 } } },
      { client: storefrontManager, body: { bookingMode: 'instant-book' } },
      { client: storefrontManager, body: { newArrivalsWindowDays: 14 } },
      { client: storefrontManager, body: { communication: { showFloatingWhatsAppButton: false } } },
      { client: pricingManager, body: { pricing: { currency: 'ARS' } } },
    ];

    for (const testCase of cases) {
      await testCase.client.withCsrf(testCase.client.request().patch(path)).send(testCase.body).expect(200);
      await unrelated.withCsrf(unrelated.request().patch(path)).send(testCase.body).expect(403);
    }
  });

  it('requires all permissions represented by a multi-group tenant config patch', async () => {
    const tenant = await fixtures.createTenant();
    const partial = await clientWithPermissions(tenant.id, [
      TenantPermission.TenantSettingsManage,
      TenantPermission.TenantStorefrontManage,
    ]);
    const fullyAllowed = await clientWithPermissions(tenant.id, [
      TenantPermission.TenantSettingsManage,
      TenantPermission.TenantStorefrontManage,
      TenantPermission.PricingManage,
    ]);
    const body = {
      timezone: 'UTC',
      newArrivalsWindowDays: 21,
      pricing: { currency: 'ARS' },
    };
    const path = '/tenant-management/tenant/config';

    await partial.withCsrf(partial.request().patch(path)).send(body).expect(403);
    await fullyAllowed.withCsrf(fullyAllowed.request().patch(path)).send(body).expect(200);
  });

  it('keeps contract signer management independent from document sending', async () => {
    const tenant = await fixtures.createTenant();
    const manager = await clientWithPermissions(tenant.id, [TenantPermission.TenantContractSignerManage]);
    const sender = await clientWithPermissions(tenant.id, [TenantPermission.ContractsSigningSend]);
    const body = {
      fullName: 'Authorized Signer',
      documentNumber: randomUUID(),
      phone: null,
      address: null,
      signatureUrl: null,
    };

    await manager.withCsrf(manager.request().post('/tenant-management/tenant/contract-signer')).send(body).expect(201);
    await sender.withCsrf(sender.request().post('/tenant-management/tenant/contract-signer')).send(body).expect(403);
  });

  it('allows an empty custom role to access authenticated exempt infrastructure', async () => {
    const tenant = await fixtures.createTenant();
    const restricted = await clientWithPermissions(tenant.id, []);

    await restricted.request().get('/auth/me').expect(200);
    await request(app.app.getHttpServer()).get('/auth/me').expect(401);
  });
});
