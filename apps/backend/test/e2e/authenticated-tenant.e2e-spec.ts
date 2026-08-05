import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';

describe('authenticated tenant HTTP flow', () => {
  let app: INestApplication;
  let closeAppResources: () => Promise<void>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    const resources = configureApp(app as NestExpressApplication);
    closeAppResources = resources.close;
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await closeAppResources();
  });

  it('boots the complete application', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ data: { status: 'ok' } });
  });

  it('maintains an authenticated tenant session across requests', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = 'owner@tenant-a.test';
    const password = 'test-password';

    await agent
      .post('/tenant-management/register')
      .send({ tenant: { name: 'Tenant A' }, owner: { name: 'Owner A', email, password } })
      .expect(201);

    const login = await agent.post('/auth/login').send({ email, password }).expect(200);
    expect(login.body.data.user).toMatchObject({ email });

    const currentUser = await agent.get('/auth/me').expect(200);
    expect(currentUser.body.data).toMatchObject({ email });

    const currentTenant = await agent.get('/tenant-management/tenant/me').expect(200);
    expect(currentTenant.body.data).toMatchObject({ name: 'Tenant A' });
  });
});
