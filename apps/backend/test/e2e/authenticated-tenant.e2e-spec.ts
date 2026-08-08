import request from 'supertest';

import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient } from '../support/create-e2e-test-client';

describe('authenticated tenant HTTP flow', () => {
  let testApp!: E2ETestApp;

  beforeAll(async () => {
    testApp = await createE2ETestApp();
  });

  afterAll(async () => {
    await testApp?.close();
  });

  it('boots the complete application', async () => {
    await request(testApp.app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ data: { status: 'ok' } });
  });

  it('maintains an authenticated tenant session across requests', async () => {
    const client = createE2ETestClient(testApp.app);
    const email = 'owner@tenant-a.test';
    const password = 'test-password';

    await client
      .request()
      .post('/tenant-management/register')
      .send({ tenant: { name: 'Tenant A' }, owner: { name: 'Owner A', email, password } })
      .expect(201);

    const login = await client.loginTenantUser({ email, password });
    expect(login.body.data.user).toMatchObject({ email });

    const currentUser = await client.request().get('/auth/me').expect(200);
    expect(currentUser.body.data).toMatchObject({ email });

    const currentTenant = await client.request().get('/tenant-management/tenant/me').expect(200);
    expect(currentTenant.body.data).toMatchObject({ name: 'Tenant A' });
  });
});
