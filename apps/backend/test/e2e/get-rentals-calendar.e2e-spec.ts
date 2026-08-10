import { randomUUID } from 'node:crypto';

import { Prisma } from '../../src/generated/prisma/client';
import { PrismaService } from '../../src/core/database/prisma.service';
import { TenantConfig } from '../../src/modules/tenant-management/domain/value-objects/tenant-config.value-object';
import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, TestFixtures } from '../support/fixtures';

const path = '/rental-commitments/rentals/calendar';

describe(`GET ${path}`, () => {
  let app: E2ETestApp;
  let prisma: PrismaService;
  let fixtures: TestFixtures;

  beforeAll(async () => {
    app = await createE2ETestApp();
    prisma = app.app.get(PrismaService);
    fixtures = createTestFixtures(prisma);
  });

  afterAll(async () => app?.close());

  async function createRental(params: {
    tenantId: string;
    branchId: string;
    periodStart: string;
    periodEnd: string;
  }): Promise<string> {
    const id = randomUUID();

    await prisma.client.$executeRaw(Prisma.sql`
      INSERT INTO v2_rentals (
        id, tenant_id, branch_id, status, period_start, period_end, created_at, updated_at
      ) VALUES (
        ${id}, ${params.tenantId}, ${params.branchId}, 'CONFIRMED'::"V2RentalStatus",
        ${params.periodStart}::timestamptz, ${params.periodEnd}::timestamptz,
        '2026-08-01T00:00:00Z'::timestamptz, '2026-08-01T00:00:00Z'::timestamptz
      )
    `);

    return id;
  }

  async function login(tenantId: string) {
    const user = await fixtures.createTenantUser({ tenantId });
    const client = createE2ETestClient(app.app);
    await client.loginTenantUser({ email: user.user.email, password: user.password });
    return client;
  }

  it('filters the inclusive local-date interval using a branch timezone override', async () => {
    const tenant = await fixtures.createTenant({
      config: { ...TenantConfig.default().toPlainObject(), timezone: 'America/Argentina/Buenos_Aires' },
    });
    const branch = await fixtures.createBranch({
      tenantId: tenant.id,
      overrides: { timezone: 'Asia/Tokyo' },
    });
    const rentalId = await createRental({
      tenantId: tenant.id,
      branchId: branch.id,
      // This instant is August 10 in Tokyo and August 9 in Buenos Aires.
      periodStart: '2026-08-09T23:30:00Z',
      periodEnd: '2026-08-10T01:00:00Z',
    });
    const client = await login(tenant.id);

    const included = await client
      .request()
      .get(path)
      .query({ branchId: branch.id, from: '2026-08-10', to: '2026-08-10' })
      .expect(200);
    expect(included.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: rentalId, pickupDate: '2026-08-10' })]),
    );

    const excluded = await client
      .request()
      .get(path)
      .query({ branchId: branch.id, from: '2026-08-09', to: '2026-08-09' })
      .expect(200);
    expect(excluded.body.data).toEqual([]);
  });

  it('uses the tenant timezone when the branch has no override', async () => {
    const tenant = await fixtures.createTenant({
      config: { ...TenantConfig.default().toPlainObject(), timezone: 'America/Argentina/Buenos_Aires' },
    });
    const branch = await fixtures.createBranch({ tenantId: tenant.id, overrides: { timezone: null } });
    const rentalId = await createRental({
      tenantId: tenant.id,
      branchId: branch.id,
      periodStart: '2026-08-10T02:30:00Z',
      periodEnd: '2026-08-10T04:00:00Z',
    });
    const client = await login(tenant.id);

    const response = await client
      .request()
      .get(path)
      .query({ branchId: branch.id, from: '2026-08-09', to: '2026-08-09' })
      .expect(200);

    expect(response.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: rentalId, pickupDate: '2026-08-09' })]),
    );
  });

  it('treats scalar timestamptz values and tstzrange values as the same instant', async () => {
    const tenant = await fixtures.createTenant();
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    const rentalId = await createRental({
      tenantId: tenant.id,
      branchId: branch.id,
      periodStart: '2026-08-10T02:30:00Z',
      periodEnd: '2026-08-10T04:00:00Z',
    });

    const rows = await prisma.client.$transaction(async (tx) => {
      // SET LOCAL is transaction-scoped. It verifies the expressions without changing a pooled connection.
      await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'Pacific/Auckland'");

      return tx.$queryRaw<
        Array<{ startsAtSameInstant: boolean; endsAtSameInstant: boolean; localDateIsSessionIndependent: boolean }>
      >(Prisma.sql`
        SELECT
          r.period_start = lower(tstzrange('2026-08-10T02:30:00Z', '2026-08-10T04:00:00Z', '[)')) AS "startsAtSameInstant",
          r.period_end = upper(tstzrange('2026-08-10T02:30:00Z', '2026-08-10T04:00:00Z', '[)')) AS "endsAtSameInstant",
          (r.period_start AT TIME ZONE 'America/Argentina/Buenos_Aires')::date = '2026-08-09'::date AS "localDateIsSessionIndependent"
        FROM v2_rentals r
        WHERE r.id = ${rentalId}
      `);
    });

    expect(rows).toEqual([{ startsAtSameInstant: true, endsAtSameInstant: true, localDateIsSessionIndependent: true }]);
  });
});
