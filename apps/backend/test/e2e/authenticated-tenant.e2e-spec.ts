import { randomUUID } from 'node:crypto';

import request from 'supertest';

import { PrismaService } from '../../src/core/database/prisma.service';
import { V2TenantStatus, V2UserStatus } from '../../src/generated/prisma/enums';
import { PasswordService } from '../../src/modules/tenant-management/auth/shared/password/password.service';
import { EmailDeliveryPort } from '../../src/modules/notifications/application/ports/email-delivery.port';
import { ObjectStoragePort } from '../../src/modules/object-storage/application/ports/object-storage.port';
import { CustomHostnameProvider } from '../../src/modules/tenant-management/application/ports/custom-hostname-provider.port';
import { GoogleIdentityVerifier } from '../../src/modules/tenant-management/auth/shared/google/google-identity-verifier.port';
import type { E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures } from '../support/fixtures';
import { runConcurrently } from '../support/concurrency';

describe('authenticated tenant HTTP flow', () => {
  let testApp!: E2ETestApp;

  beforeAll(async () => {
    const previousRegistrationEnabled = process.env.PUBLIC_TENANT_REGISTRATION_ENABLED;
    process.env.PUBLIC_TENANT_REGISTRATION_ENABLED = 'true';

    try {
      const { createE2ETestApp } = await import('../support/create-e2e-test-app');
      testApp = await createE2ETestApp();
    } finally {
      if (previousRegistrationEnabled === undefined) {
        delete process.env.PUBLIC_TENANT_REGISTRATION_ENABLED;
      } else {
        process.env.PUBLIC_TENANT_REGISTRATION_ENABLED = previousRegistrationEnabled;
      }
    }
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
    const firstLoginRequest = client.request().post('/auth/customer/google/finalize');
    await client.withStorefrontTenantContext(firstLoginRequest, storefrontTenantContext(tenant));
    const firstLogin = await firstLoginRequest.send({ ticket: firstTicket }).expect(200);
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
    const secondLoginRequest = client.request().post('/auth/customer/google/finalize');
    await client.withStorefrontTenantContext(secondLoginRequest, storefrontTenantContext(tenant));
    const secondLogin = await secondLoginRequest.send({ ticket: secondTicket }).expect(200);

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

  it('rolls back new Google customer provisioning when identity creation fails', async () => {
    const prisma = testApp.app.get(PrismaService);
    const fixtures = createTestFixtures(prisma);
    const tenant = await fixtures.createTenant();
    const googleIdentity = googleCustomerIdentity({
      providerSubject: `rollback-subject-${randomUUID()}`,
      email: `rollback-${randomUUID()}@example.test`,
    });

    await prisma.client.$executeRawUnsafe(`
      CREATE FUNCTION fail_google_customer_identity_insert() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced Google identity insert failure';
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_google_customer_identity_insert
      BEFORE INSERT ON "v2_rental_customer_auth_identities"
      FOR EACH ROW EXECUTE FUNCTION fail_google_customer_identity_insert();
    `);

    try {
      testApp.externals.googleIdentity.setNextIdentity(googleIdentity);
      const state = await issueGoogleState(testApp, tenant.id, tenant.slug);
      await request(testApp.app.getHttpServer())
        .post('/auth/customer/google/handoff')
        .send({ code: `rollback-code-${randomUUID()}`, state })
        .expect(500);

      await expect(prisma.client.v2RentalCustomer.count({ where: { tenantId: tenant.id } })).resolves.toBe(0);
      await expect(prisma.client.v2RentalCustomerAuthIdentity.count({ where: { tenantId: tenant.id } })).resolves.toBe(
        0,
      );
      await expect(prisma.client.authHandoffToken.count({ where: { tenantId: tenant.id } })).resolves.toBe(0);
    } finally {
      await prisma.client.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS fail_google_customer_identity_insert ON "v2_rental_customer_auth_identities"; DROP FUNCTION IF EXISTS fail_google_customer_identity_insert();',
      );
    }
  });

  it('links an existing normalized-email customer before recording Google login metadata', async () => {
    const prisma = testApp.app.get(PrismaService);
    const client = createE2ETestClient(testApp.app);
    const fixtures = createTestFixtures(prisma);
    const tenant = await fixtures.createTenant();
    const existing = await fixtures.createRentalCustomer({
      tenantId: tenant.id,
      overrides: { email: `existing-google-${randomUUID()}@example.test`, lastLoginAt: null, avatarUrl: null },
    });
    const googleIdentity = googleCustomerIdentity({
      providerSubject: `existing-customer-subject-${randomUUID()}`,
      email: existing.customer.email.toUpperCase(),
      pictureUrl: 'https://example.test/avatar.png',
    });

    testApp.externals.googleIdentity.setNextIdentity(googleIdentity);
    const ticket = await createCustomerGoogleHandoffTicket(
      testApp,
      tenant.id,
      tenant.slug,
      `existing-code-${randomUUID()}`,
    );
    const finalizeRequest = client.request().post('/auth/customer/google/finalize');
    await client.withStorefrontTenantContext(finalizeRequest, storefrontTenantContext(tenant));
    await finalizeRequest.send({ ticket }).expect(200);

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
    ).resolves.toMatchObject({ customerId: existing.customer.id });
    await expect(
      prisma.client.v2RentalCustomer.findUnique({ where: { id: existing.customer.id } }),
    ).resolves.toMatchObject({
      lastLoginAt: expect.any(Date),
      avatarUrl: googleIdentity.pictureUrl,
    });
  });

  it('rejects a conflicting existing-customer Google link without recording a successful login', async () => {
    const prisma = testApp.app.get(PrismaService);
    const fixtures = createTestFixtures(prisma);
    const tenant = await fixtures.createTenant();
    const existing = await fixtures.createRentalCustomer({
      tenantId: tenant.id,
      overrides: { email: `conflicting-google-${randomUUID()}@example.test`, lastLoginAt: null, avatarUrl: null },
    });
    await prisma.client.v2RentalCustomerAuthIdentity.create({
      data: {
        tenantId: tenant.id,
        customerId: existing.customer.id,
        provider: 'GOOGLE',
        providerAccountId: `winning-subject-${randomUUID()}`,
      },
    });
    const losingIdentity = googleCustomerIdentity({
      providerSubject: `losing-subject-${randomUUID()}`,
      email: existing.customer.email,
    });

    testApp.externals.googleIdentity.setNextIdentity(losingIdentity);
    const state = await issueGoogleState(testApp, tenant.id, tenant.slug);
    await request(testApp.app.getHttpServer())
      .post('/auth/customer/google/handoff')
      .send({ code: `losing-code-${randomUUID()}`, state })
      .expect(401);

    await expect(
      prisma.client.v2RentalCustomer.findUnique({ where: { id: existing.customer.id } }),
    ).resolves.toMatchObject({
      lastLoginAt: null,
      avatarUrl: null,
    });
    await expect(
      prisma.client.v2RentalCustomerAuthIdentity.count({
        where: { tenantId: tenant.id, customerId: existing.customer.id },
      }),
    ).resolves.toBe(1);
    await expect(prisma.client.authHandoffToken.count({ where: { tenantId: tenant.id } })).resolves.toBe(0);
  });

  it('converges concurrent first Google logins for the same tenant-scoped subject', async () => {
    const prisma = testApp.app.get(PrismaService);
    const fixtures = createTestFixtures(prisma);
    const tenant = await fixtures.createTenant();
    const identity = googleCustomerIdentity({
      providerSubject: `concurrent-subject-${randomUUID()}`,
      email: `concurrent-${randomUUID()}@example.test`,
    });
    const firstCode = `concurrent-first-${randomUUID()}`;
    const secondCode = `concurrent-second-${randomUUID()}`;
    testApp.externals.googleIdentity.setIdentityForAuthorizationCode(firstCode, identity);
    testApp.externals.googleIdentity.setIdentityForAuthorizationCode(secondCode, identity);

    const results = await runConcurrently(
      [firstCode, secondCode].map((code) => async () => {
        const state = await issueGoogleState(testApp, tenant.id, tenant.slug);
        return request(testApp.app.getHttpServer()).post('/auth/customer/google/handoff').send({ code, state });
      }),
    );

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'fulfilled', value: expect.objectContaining({ status: 200 }) }),
        expect.objectContaining({ status: 'fulfilled', value: expect.objectContaining({ status: 200 }) }),
      ]),
    );
    await expect(prisma.client.v2RentalCustomer.count({ where: { tenantId: tenant.id } })).resolves.toBe(1);
    await expect(prisma.client.v2RentalCustomerAuthIdentity.count({ where: { tenantId: tenant.id } })).resolves.toBe(1);
  });

  it('allows only one concurrent Google subject to link a shared tenant email', async () => {
    const prisma = testApp.app.get(PrismaService);
    const fixtures = createTestFixtures(prisma);
    const tenant = await fixtures.createTenant();
    const email = `shared-google-${randomUUID()}@example.test`;
    const firstCode = `shared-first-${randomUUID()}`;
    const secondCode = `shared-second-${randomUUID()}`;
    testApp.externals.googleIdentity.setIdentityForAuthorizationCode(
      firstCode,
      googleCustomerIdentity({ providerSubject: `shared-first-subject-${randomUUID()}`, email }),
    );
    testApp.externals.googleIdentity.setIdentityForAuthorizationCode(
      secondCode,
      googleCustomerIdentity({ providerSubject: `shared-second-subject-${randomUUID()}`, email: email.toUpperCase() }),
    );

    const results = await runConcurrently(
      [firstCode, secondCode].map((code) => async () => {
        const state = await issueGoogleState(testApp, tenant.id, tenant.slug);
        return request(testApp.app.getHttpServer()).post('/auth/customer/google/handoff').send({ code, state });
      }),
    );
    const responses = results.map((result) => (result.status === 'fulfilled' ? result.value : undefined));

    expect(responses.filter((response) => response?.status === 200)).toHaveLength(1);
    expect(responses.filter((response) => response?.status === 401)).toHaveLength(1);
    await expect(prisma.client.v2RentalCustomer.count({ where: { tenantId: tenant.id } })).resolves.toBe(1);
    await expect(prisma.client.v2RentalCustomerAuthIdentity.count({ where: { tenantId: tenant.id } })).resolves.toBe(1);
    await expect(prisma.client.authHandoffToken.count({ where: { tenantId: tenant.id } })).resolves.toBe(1);
  });

  it('converges same-subject Google observations with differing emails without an orphan customer', async () => {
    const prisma = testApp.app.get(PrismaService);
    const fixtures = createTestFixtures(prisma);
    const tenant = await fixtures.createTenant();
    const subject = `different-email-subject-${randomUUID()}`;
    const firstCode = `different-email-first-${randomUUID()}`;
    const secondCode = `different-email-second-${randomUUID()}`;
    testApp.externals.googleIdentity.setIdentityForAuthorizationCode(
      firstCode,
      googleCustomerIdentity({ providerSubject: subject, email: `first-${randomUUID()}@example.test` }),
    );
    testApp.externals.googleIdentity.setIdentityForAuthorizationCode(
      secondCode,
      googleCustomerIdentity({ providerSubject: subject, email: `second-${randomUUID()}@example.test` }),
    );

    const results = await runConcurrently(
      [firstCode, secondCode].map((code) => async () => {
        const state = await issueGoogleState(testApp, tenant.id, tenant.slug);
        return request(testApp.app.getHttpServer()).post('/auth/customer/google/handoff').send({ code, state });
      }),
    );

    expect(results.every((result) => result.status === 'fulfilled' && result.value.status === 200)).toBe(true);
    await expect(prisma.client.v2RentalCustomer.count({ where: { tenantId: tenant.id } })).resolves.toBe(1);
    await expect(prisma.client.v2RentalCustomerAuthIdentity.count({ where: { tenantId: tenant.id } })).resolves.toBe(1);
  });

  it('authenticates a fixture-created rental customer', async () => {
    const client = createE2ETestClient(testApp.app);
    const fixtures = createTestFixtures(testApp.app.get(PrismaService));
    const tenant = await fixtures.createTenant();
    const rentalCustomer = await fixtures.createRentalCustomer({
      tenantId: tenant.id,
      localCredential: {},
    });

    const login = await client.loginTenantCustomer(
      {
        email: rentalCustomer.customer.email,
        password: rentalCustomer.password,
      },
      storefrontTenantContext(tenant),
    );

    expect(login.body.data.customer).toMatchObject({ email: rentalCustomer.customer.email });
  });
});

function googleCustomerIdentity(
  overrides: Partial<{
    providerSubject: string;
    email: string;
    pictureUrl: string | null;
  }> = {},
) {
  return {
    provider: 'GOOGLE' as const,
    providerSubject: `google-subject-${randomUUID()}`,
    email: `google-${randomUUID()}@example.test`,
    emailVerified: true,
    givenName: 'Google',
    familyName: 'Customer',
    pictureUrl: null,
    ...overrides,
  };
}

async function issueGoogleState(testApp: E2ETestApp, tenantId: string, tenantSlug: string): Promise<string> {
  const client = createE2ETestClient(testApp.app);
  const stateRequest = client.request().post('/auth/customer/google/state');
  await client.withStorefrontTenantContext(stateRequest, {
    tenantId,
    canonicalHost: `${tenantSlug}.localhost`,
  });
  const response = await stateRequest.send({ redirectPath: '/account' }).expect(200);

  return (response.body.data as { state: string }).state;
}

async function createCustomerGoogleHandoffTicket(
  testApp: E2ETestApp,
  tenantId: string,
  tenantSlug: string,
  code: string,
): Promise<string> {
  const state = await issueGoogleState(testApp, tenantId, tenantSlug);

  const handoffResponse = await request(testApp.app.getHttpServer())
    .post('/auth/customer/google/handoff')
    .send({ code, state })
    .expect(200);

  return (handoffResponse.body.data as { ticket: string }).ticket;
}

function storefrontTenantContext(tenant: { id: string; slug: string }) {
  const canonicalHost = `${tenant.slug}.localhost`;

  return { tenantId: tenant.id, canonicalHost };
}
