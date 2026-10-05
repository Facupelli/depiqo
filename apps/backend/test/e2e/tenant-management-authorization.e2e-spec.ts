import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { randomUUID } from 'node:crypto';

import {
  TenantPermission,
  type TenantPermission as TenantPermissionId,
  type UpdateTenantConfigBodyDto,
} from '@repo/api-contracts';
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

    const { customer } = await fixtures.createRentalCustomer({ tenantId: tenant.id });
    const sensitivePath = `/tenant-management/rental-customers/${customer.id}/backoffice-sensitive-profile`;
    const sensitiveOnly = await clientWithPermissions(tenant.id, [TenantPermission.CustomersSensitiveRead]);
    const authorized = await clientWithPermissions(tenant.id, [
      TenantPermission.CustomersRead,
      TenantPermission.CustomersSensitiveRead,
    ]);
    const reviewer = await clientWithPermissions(tenant.id, [TenantPermission.CustomersOnboardingManage]);
    await allowed.request().get(sensitivePath).expect(403);
    await sensitiveOnly.request().get(sensitivePath).expect(403);
    await reviewer.request().get(sensitivePath).expect(403);
    const noProfile = await authorized.request().get(sensitivePath).expect(200);
    expect(noProfile.body.data).toEqual({ customerId: customer.id, submittedProfile: null });

    const otherTenant = await fixtures.createTenant();
    const { customer: foreignCustomer } = await fixtures.createRentalCustomer({ tenantId: otherTenant.id });
    await authorized.request().get(sensitivePath.replace(customer.id, foreignCustomer.id)).expect(404);
    await prisma.client.v2RentalCustomer.update({ where: { id: customer.id }, data: { deletedAt: new Date() } });
    await authorized.request().get(sensitivePath).expect(404);
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

  it('requires internal credentials and either review or identity-document permission', async () => {
    const tenant = await fixtures.createTenant();
    const reviewer = await clientWithPermissions(tenant.id, [TenantPermission.CustomersOnboardingManage]);
    const reader = await clientWithPermissions(tenant.id, [TenantPermission.CustomersRead]);
    const documentOnly = await clientWithPermissions(tenant.id, [TenantPermission.CustomersIdentityDocumentRead]);
    const unrelated = await clientWithPermissions(tenant.id, [TenantPermission.RentalsRead]);
    const generalDocumentReader = await clientWithPermissions(tenant.id, [
      TenantPermission.CustomersRead,
      TenantPermission.CustomersIdentityDocumentRead,
    ]);
    const { customer } = await fixtures.createRentalCustomer({
      tenantId: tenant.id,
      overrides: { onboardingStatus: 'PENDING' },
    });
    const path = `/internal/tenant-management/rental-customers/${customer.id}/identity-document-descriptor`;

    await reader.request().get(path).set('x-internal-token', 'test-bff-token').expect(403);
    await unrelated.request().get(path).set('x-internal-token', 'test-bff-token').expect(403);
    await documentOnly.request().get(path).set('x-internal-token', 'test-bff-token').expect(404);
    await documentOnly.request().get(path).expect(401);
    await generalDocumentReader.request().get(path).expect(401);
    await generalDocumentReader.request().get(path).set('x-internal-token', 'wrong').expect(401);
    await generalDocumentReader.request().get(path).set('x-internal-token', 'test-bff-token').expect(404);
    await reviewer.request().get(path).set('x-internal-token', 'wrong').expect(401);
    await reviewer.request().get(path).set('x-internal-token', 'test-bff-token').expect(404);

    const reference = `customers/${customer.id}/identity-document-123.pdf`;
    await prisma.client.v2CustomerProfile.create({
      data: {
        customerId: customer.id,
        fullName: 'Document Holder',
        phone: '123',
        birthDate: new Date('1990-03-15T00:00:00.000Z'),
        documentNumber: '12345678',
        identityDocumentPath: reference,
        address: 'Street',
        city: 'City',
        stateRegion: 'Region',
        country: 'Country',
        occupation: 'Engineer',
        contact1Name: 'Ref',
        contact1Phone: '111',
        contact1Relationship: 'Friend',
        contact2Name: '',
        contact2Phone: '',
        contact2Relationship: '',
      },
    });
    const generalDescriptor = await generalDocumentReader
      .request()
      .get(path)
      .set('x-internal-token', 'test-bff-token')
      .expect(200);
    expect(generalDescriptor.body.data).toEqual({ objectPath: reference });
    const directDescriptor = await documentOnly
      .request()
      .get(path)
      .set('x-internal-token', 'test-bff-token')
      .expect(200);
    expect(directDescriptor.body.data).toEqual({ objectPath: reference });
    await documentOnly
      .request()
      .get(`/tenant-management/rental-customers/${customer.id}/backoffice-profile`)
      .expect(403);
    await reviewer.request().get(path).set('x-internal-token', 'test-bff-token').expect(200);
    for (const onboardingStatus of ['APPROVED', 'REJECTED'] as const) {
      await prisma.client.v2RentalCustomer.update({ where: { id: customer.id }, data: { onboardingStatus } });
      await generalDocumentReader.request().get(path).set('x-internal-token', 'test-bff-token').expect(200);
      await reviewer.request().get(path).set('x-internal-token', 'test-bff-token').expect(200);
    }
    await reviewer.request().get(`/tenant-management/rental-customers/${customer.id}/backoffice-profile`).expect(403);
    await prisma.client.v2CustomerProfile.update({
      where: { customerId: customer.id },
      data: { identityDocumentPath: `customers/${randomUUID()}/identity-document-123.pdf` },
    });
    await generalDocumentReader.request().get(path).set('x-internal-token', 'test-bff-token').expect(404);
    await documentOnly.request().get(path).set('x-internal-token', 'test-bff-token').expect(404);
    const foreignTenant = await fixtures.createTenant();
    const { customer: foreignCustomer } = await fixtures.createRentalCustomer({ tenantId: foreignTenant.id });
    await reviewer
      .request()
      .get(path.replace(customer.id, foreignCustomer.id))
      .set('x-internal-token', 'test-bff-token')
      .expect(404);
    await generalDocumentReader
      .request()
      .get(path.replace(customer.id, foreignCustomer.id))
      .set('x-internal-token', 'test-bff-token')
      .expect(404);
    await documentOnly
      .request()
      .get(path.replace(customer.id, foreignCustomer.id))
      .set('x-internal-token', 'test-bff-token')
      .expect(404);
    await prisma.client.v2RentalCustomer.update({ where: { id: customer.id }, data: { deletedAt: new Date() } });
    await generalDocumentReader.request().get(path).set('x-internal-token', 'test-bff-token').expect(404);
    await documentOnly.request().get(path).set('x-internal-token', 'test-bff-token').expect(404);
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
    const cases: Array<{ client: E2ETestClient; body: UpdateTenantConfigBodyDto }> = [
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
