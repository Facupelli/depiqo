import { randomUUID } from 'node:crypto';

import request from 'supertest';

import { PrismaService } from '../../src/core/database/prisma.service';
import { V2TenantStatus, V2UserStatus } from '../../src/generated/prisma/enums';
import { PasswordService } from '../../src/modules/tenant-management/auth/shared/password/password.service';
import { GoogleAuthStateService } from '../../src/modules/tenant-management/auth/shared/google/google-auth-state.service';
import { EmailDeliveryPort } from '../../src/modules/notifications/application/ports/email-delivery.port';
import { ObjectStoragePort } from '../../src/modules/object-storage/application/ports/object-storage.port';
import { CustomHostnameProvider } from '../../src/modules/tenant-management/application/ports/custom-hostname-provider.port';
import { GoogleIdentityVerifier } from '../../src/modules/tenant-management/auth/shared/google/google-identity-verifier.port';
import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures } from '../support/fixtures';

describe('authenticated tenant HTTP flow', () => {
  let testApp!: E2ETestApp;

  beforeAll(async () => {
    testApp = await createE2ETestApp();
  });

  afterAll(async () => {
    await testApp?.close();
  });

  it('uses test fakes for every outbound provider', () => {
    expect(testApp.app.get(EmailDeliveryPort)).toBe(testApp.externals.emailDelivery);
    expect(testApp.app.get(ObjectStoragePort)).toBe(testApp.externals.objectStorage);
    expect(testApp.app.get(CustomHostnameProvider)).toBe(testApp.externals.customHostname);
    expect(testApp.app.get(GoogleIdentityVerifier)).toBe(testApp.externals.googleIdentity);
  });

  it('boots the complete application', async () => {
    await request(testApp.app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ data: { status: 'ok' } });
  });

  it('registers a tenant owner with exactly one local credential', async () => {
    const prisma = testApp.app.get(PrismaService);
    const passwordService = new PasswordService();
    const unique = randomUUID();
    const email = `owner-${unique}@test.local`;
    const password = 'registered-owner-password';

    const registration = await request(testApp.app.getHttpServer())
      .post('/tenant-management/register')
      .send({
        tenant: { name: `Registered Tenant ${unique}` },
        owner: { name: 'Registered Owner', email, password },
      })
      .expect(201);

    const registered = registration.body.data as { tenantId: string; tenantUserId: string };
    const user = await prisma.client.v2TenantUser.findUnique({
      where: { id: registered.tenantUserId },
      include: { localCredential: true },
    });

    expect(user).toMatchObject({
      id: registered.tenantUserId,
      tenantId: registered.tenantId,
      email,
      status: V2UserStatus.ACTIVE,
    });
    expect(user?.localCredential).not.toBeNull();
    await expect(
      passwordService.verifyPassword({
        password,
        hash: user!.localCredential!.passwordHash,
        algorithm: user!.localCredential!.passwordAlgorithm,
      }),
    ).resolves.toBe(true);
    await expect(prisma.client.v2LocalCredential.count({ where: { userId: registered.tenantUserId } })).resolves.toBe(
      1,
    );
  });

  it('rolls back tenant registration when owner account persistence conflicts', async () => {
    const prisma = testApp.app.get(PrismaService);
    const fixtures = createTestFixtures(prisma);
    const existingTenant = await fixtures.createTenant();
    const existingUser = await fixtures.createTenantUser({ tenantId: existingTenant.id });
    const unique = randomUUID();
    const tenantName = `Rollback Tenant ${unique}`;
    const tenantSlug = `rollback-tenant-${unique}`;

    await request(testApp.app.getHttpServer())
      .post('/tenant-management/register')
      .send({
        tenant: { name: tenantName },
        owner: { name: 'Duplicate Email Owner', email: existingUser.user.email, password: 'another-password' },
      })
      .expect(500);

    await expect(prisma.client.v2Tenant.findUnique({ where: { slug: tenantSlug } })).resolves.toBeNull();
  });

  it('authenticates a fixture-created tenant user with a valid local credential and maintains its session', async () => {
    const client = createE2ETestClient(testApp.app);
    const fixtures = createTestFixtures(testApp.app.get(PrismaService));
    const tenant = await fixtures.createTenant({ name: 'Tenant A' });
    const tenantUser = await fixtures.createTenantUser({ tenantId: tenant.id });

    const login = await client.loginTenantUser({ email: tenantUser.user.email, password: tenantUser.password });
    expect(login.body.data.user).toMatchObject({ email: tenantUser.user.email });

    const currentUser = await client.request().get('/auth/me').expect(200);
    expect(currentUser.body.data).toMatchObject({ email: tenantUser.user.email });

    const currentTenant = await client.request().get('/tenant-management/tenant/me').expect(200);
    expect(currentTenant.body.data).toMatchObject({ name: 'Tenant A' });
  });

  it('rejects a tenant user without a local credential', async () => {
    const prisma = testApp.app.get(PrismaService);
    const fixtures = createTestFixtures(prisma);
    const tenant = await fixtures.createTenant();
    const email = `no-credential-${randomUUID()}@test.local`;

    await prisma.client.v2TenantUser.create({
      data: { tenantId: tenant.id, email, name: 'No Credential User' },
    });

    await request(testApp.app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'any-password' })
      .expect(401);
  });

  it('rejects an incorrect tenant-user password', async () => {
    const fixtures = createTestFixtures(testApp.app.get(PrismaService));
    const tenant = await fixtures.createTenant();
    const tenantUser = await fixtures.createTenantUser({ tenantId: tenant.id });

    await request(testApp.app.getHttpServer())
      .post('/auth/login')
      .send({ email: tenantUser.user.email, password: 'incorrect-password' })
      .expect(401);
  });

  it('rejects a non-active tenant user with a valid local credential', async () => {
    const fixtures = createTestFixtures(testApp.app.get(PrismaService));
    const tenant = await fixtures.createTenant();
    const tenantUser = await fixtures.createTenantUser({
      tenantId: tenant.id,
      overrides: { status: V2UserStatus.SUSPENDED },
    });

    await request(testApp.app.getHttpServer())
      .post('/auth/login')
      .send({ email: tenantUser.user.email, password: tenantUser.password })
      .expect(401);
  });

  it('rejects an active tenant user under a disabled tenant', async () => {
    const prisma = testApp.app.get(PrismaService);
    const fixtures = createTestFixtures(prisma);
    const tenant = await fixtures.createTenant();
    const tenantUser = await fixtures.createTenantUser({ tenantId: tenant.id });

    await prisma.client.v2Tenant.update({
      where: { id: tenant.id },
      data: { status: V2TenantStatus.DISABLED },
    });

    await request(testApp.app.getHttpServer())
      .post('/auth/login')
      .send({ email: tenantUser.user.email, password: tenantUser.password })
      .expect(401);
  });

  it('rejects an active tenant user under a soft-deleted tenant', async () => {
    const prisma = testApp.app.get(PrismaService);
    const fixtures = createTestFixtures(prisma);
    const tenant = await fixtures.createTenant();
    const tenantUser = await fixtures.createTenantUser({ tenantId: tenant.id });

    await prisma.client.v2Tenant.update({
      where: { id: tenant.id },
      data: { deletedAt: new Date() },
    });

    await request(testApp.app.getHttpServer())
      .post('/auth/login')
      .send({ email: tenantUser.user.email, password: tenantUser.password })
      .expect(401);
  });

  it('rejects an existing tenant-user session after its tenant is disabled', async () => {
    const prisma = testApp.app.get(PrismaService);
    const client = createE2ETestClient(testApp.app);
    const fixtures = createTestFixtures(prisma);
    const tenant = await fixtures.createTenant();
    const tenantUser = await fixtures.createTenantUser({ tenantId: tenant.id });

    await client.loginTenantUser({ email: tenantUser.user.email, password: tenantUser.password });
    await prisma.client.v2Tenant.update({
      where: { id: tenant.id },
      data: { status: V2TenantStatus.DISABLED },
    });

    await client.request().get('/auth/me').expect(401);
  });

  it('rejects an existing tenant-user session after its tenant is soft-deleted', async () => {
    const prisma = testApp.app.get(PrismaService);
    const client = createE2ETestClient(testApp.app);
    const fixtures = createTestFixtures(prisma);
    const tenant = await fixtures.createTenant();
    const tenantUser = await fixtures.createTenantUser({ tenantId: tenant.id });

    await client.loginTenantUser({ email: tenantUser.user.email, password: tenantUser.password });
    await prisma.client.v2Tenant.update({
      where: { id: tenant.id },
      data: { deletedAt: new Date() },
    });

    await client.request().get('/auth/me').expect(401);
  });

  it('continues to reject a tenant-user session with a stale session version', async () => {
    const prisma = testApp.app.get(PrismaService);
    const client = createE2ETestClient(testApp.app);
    const fixtures = createTestFixtures(prisma);
    const tenant = await fixtures.createTenant();
    const tenantUser = await fixtures.createTenantUser({ tenantId: tenant.id });

    await client.loginTenantUser({ email: tenantUser.user.email, password: tenantUser.password });
    await prisma.client.v2TenantUser.update({
      where: { id: tenantUser.user.id },
      data: { sessionVersion: { increment: 1 } },
    });

    await client.request().get('/auth/me').expect(401);
  });

  it('creates and resolves a tenant-scoped Google customer identity', async () => {
    const prisma = testApp.app.get(PrismaService);
    const client = createE2ETestClient(testApp.app);
    const fixtures = createTestFixtures(prisma);
    const tenant = await fixtures.createTenant();
    const googleIdentity = {
      provider: 'GOOGLE' as const,
      providerSubject: 'customer-google-subject',
      email: 'customer-google@example.test',
      emailVerified: true,
      givenName: 'Customer',
      familyName: 'Google',
      pictureUrl: null,
    };

    testApp.externals.googleIdentity.setNextIdentity(googleIdentity);
    const firstTicket = await createCustomerGoogleHandoffTicket(testApp, tenant.id, tenant.slug, 'first-google-code');
    const firstLogin = await client
      .request()
      .post('/auth/customer/google/finalize')
      .send({ ticket: firstTicket })
      .expect(200);
    const firstCustomer = firstLogin.body.data.customer as { id: string; tenantId: string; email: string };

    expect(firstCustomer).toMatchObject({ tenantId: tenant.id, email: googleIdentity.email });
    await expect(client.request().get('/auth/me')).resolves.toMatchObject({ status: 200 });
    await expect(
      prisma.client.v2RentalCustomerAuthIdentity.findUnique({
        where: {
          tenantId_provider_providerAccountId: {
            tenantId: tenant.id,
            provider: 'GOOGLE',
            providerAccountId: googleIdentity.providerSubject,
          },
        },
      }),
    ).resolves.toMatchObject({ tenantId: tenant.id, customerId: firstCustomer.id });

    testApp.externals.googleIdentity.setNextIdentity(googleIdentity);
    const secondTicket = await createCustomerGoogleHandoffTicket(testApp, tenant.id, tenant.slug, 'second-google-code');
    const secondLogin = await client
      .request()
      .post('/auth/customer/google/finalize')
      .send({ ticket: secondTicket })
      .expect(200);

    expect(secondLogin.body.data.customer).toMatchObject({ id: firstCustomer.id, tenantId: tenant.id });
    await expect(
      prisma.client.v2RentalCustomerAuthIdentity.count({
        where: {
          tenantId: tenant.id,
          provider: 'GOOGLE',
          providerAccountId: googleIdentity.providerSubject,
        },
      }),
    ).resolves.toBe(1);
  });

  it('authenticates a fixture-created rental customer', async () => {
    const client = createE2ETestClient(testApp.app);
    const fixtures = createTestFixtures(testApp.app.get(PrismaService));
    const tenant = await fixtures.createTenant();
    const rentalCustomer = await fixtures.createRentalCustomer({ tenantId: tenant.id });

    const login = await client.loginTenantCustomer({
      tenantId: tenant.id,
      email: rentalCustomer.customer.email,
      password: rentalCustomer.password,
    });

    expect(login.body.data.customer).toMatchObject({ email: rentalCustomer.customer.email });
  });
});

async function createCustomerGoogleHandoffTicket(
  testApp: E2ETestApp,
  tenantId: string,
  tenantSlug: string,
  code: string,
): Promise<string> {
  const portalOrigin = `http://${tenantSlug}.localhost`;
  const state = testApp.app.get(GoogleAuthStateService).issueState({
    tenantId,
    portalOrigin,
    redirectPath: '/account',
  });

  const handoffResponse = await request(testApp.app.getHttpServer())
    .post('/auth/customer/google/handoff')
    .send({ code, state })
    .expect(200);

  return (handoffResponse.body.data as { ticket: string }).ticket;
}
