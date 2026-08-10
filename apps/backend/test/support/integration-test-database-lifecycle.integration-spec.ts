import request from 'supertest';
import { Client } from 'pg';

import { PrismaService } from '../../src/core/database/prisma.service';
import { createE2ETestApp, E2ETestApp } from './create-e2e-test-app';
import { getPostgreSqlSessions, IntegrationTestDatabase } from './integration-test-context';

describe('integration test database lifecycle', () => {
  it('closes Prisma and an exercised PostgreSQL session store before dropping the clone', async () => {
    const database = await IntegrationTestDatabase.create();
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = database.url;
    let testApp: E2ETestApp | undefined;
    let dropped = false;

    try {
      testApp = await createE2ETestApp({ databaseUrl: database.url });
      const prisma = testApp.app.get(PrismaService);
      const currentDatabase = await prisma.client.$queryRaw<Array<{ databaseName: string }>>`
        SELECT current_database() AS "databaseName"
      `;
      expect(currentDatabase).toEqual([{ databaseName: database.name }]);

      await request(testApp.app.getHttpServer()).get('/auth/csrf').expect(200);
      const cloneSessionRows = await prisma.client.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM session
      `;
      expect(cloneSessionRows).toEqual([{ count: 1n }]);
      await expect(countTemplateSessions()).resolves.toBe(0);

      await testApp.close();
      testApp = undefined;

      await expect(getPostgreSqlSessions(requiredEnv('TEST_DATABASE_ADMIN_URL'), database.name)).resolves.toEqual([]);
      await database.drop();
      dropped = true;
    } finally {
      process.env.DATABASE_URL = previousDatabaseUrl;
      await testApp?.close();
      if (!dropped) {
        const sessions = await getPostgreSqlSessions(requiredEnv('TEST_DATABASE_ADMIN_URL'), database.name);
        if (sessions.length === 0) await database.drop();
      }
    }
  });
});

async function countTemplateSessions(): Promise<number> {
  const adminUrl = requiredEnv('TEST_DATABASE_ADMIN_URL');
  const templateName = requiredEnv('TEST_DATABASE_TEMPLATE_NAME');
  const templateUrl = new URL(adminUrl);
  templateUrl.pathname = `/${encodeURIComponent(templateName)}`;
  const client = new Client({ connectionString: templateUrl.toString() });
  await client.connect();
  try {
    const result = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM session');
    return Number(result.rows[0]?.count ?? 0);
  } finally {
    await client.end();
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}
