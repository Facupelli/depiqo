import { PrismaService } from '../../src/core/database/prisma.service';
import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, TestFixtures } from '../support/fixtures';
import { expectValidationProblem } from '../support/problem-response';

describe('promotion local-date validity HTTP flow', () => {
  let app: E2ETestApp;
  let prisma: PrismaService;
  let fixtures: TestFixtures;

  beforeAll(async () => {
    app = await createE2ETestApp();
    prisma = app.app.get(PrismaService);
    fixtures = createTestFixtures(prisma);
  });

  afterAll(async () => app?.close());

  async function tenantUserClient(): Promise<{ client: E2ETestClient; tenantId: string }> {
    const tenant = await fixtures.createTenant();
    const tenantUser = await fixtures.createTenantUser({ tenantId: tenant.id });
    const client = createE2ETestClient(app.app);
    await client.loginTenantUser({ email: tenantUser.user.email, password: tenantUser.password });

    return { client, tenantId: tenant.id };
  }

  function body(validFrom: string, validUntil: string) {
    return {
      name: 'Local date promotion',
      activation: 'AUTOMATIC',
      priority: 0,
      stackable: false,
      isActive: true,
      validFrom,
      validUntil,
      effectType: 'PERCENTAGE_OFF',
      effectValue: '10',
      scopes: [{ type: 'ALL' }],
      exclusions: [],
    };
  }

  it('accepts and returns an inclusive same-day local-date validity range', async () => {
    const { client, tenantId } = await tenantUserClient();
    const response = await client
      .withCsrf(client.request().post('/pricing/promotions'))
      .send(body('2026-08-10', '2026-08-10'))
      .expect(201);

    const promotion = await prisma.client.v2Promotion.findUniqueOrThrow({ where: { id: response.body.data.id } });
    expect(promotion.tenantId).toBe(tenantId);

    const detail = await client.request().get(`/pricing/promotions/${promotion.id}`).expect(200);
    expect(detail.body.data).toMatchObject({ validFrom: '2026-08-10', validUntil: '2026-08-10' });
  });

  it.each(['2026-08-10T00:00:00Z', '2026-08-10T10:00:00-03:00'])(
    'rejects datetime validity input %s',
    async (value) => {
      const { client } = await tenantUserClient();
      const response = await client
        .withCsrf(client.request().post('/pricing/promotions'))
        .send(body(value, '2026-08-10'));

      expectValidationProblem(response);
    },
  );
});
