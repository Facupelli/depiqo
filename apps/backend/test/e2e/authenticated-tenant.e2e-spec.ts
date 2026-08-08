import request from 'supertest';

import { PrismaService } from '../../src/core/database/prisma.service';
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

  it('authenticates a fixture-created tenant user and maintains its session', async () => {
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
