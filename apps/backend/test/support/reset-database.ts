import { Client } from 'pg';

const TEST_DATABASE_PREFIX = 'depiqo_test_';

export async function resetDatabase(): Promise<void> {
  const databaseUrl = requiredEnv('DATABASE_URL');
  const expectedDatabase = requiredEnv('TEST_DATABASE_NAME');

  if (!expectedDatabase.startsWith(TEST_DATABASE_PREFIX)) {
    throw new Error(`Refusing to reset database without ${TEST_DATABASE_PREFIX} prefix.`);
  }

  const configuredDatabase = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
  if (configuredDatabase !== expectedDatabase) {
    throw new Error('DATABASE_URL does not target TEST_DATABASE_NAME.');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const current = await client.query<{ database_name: string }>('SELECT current_database() AS database_name');
    if (current.rows[0]?.database_name !== expectedDatabase) {
      throw new Error('Connected database does not match the generated test database.');
    }

    const tables = await client.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> '_prisma_migrations'
      ORDER BY table_name
    `);

    if (tables.rows.length === 0) return;
    const identifiers = tables.rows.map(({ table_name }) => `"public".${quoteIdentifier(table_name)}`).join(', ');
    await client.query(`TRUNCATE TABLE ${identifiers} RESTART IDENTITY CASCADE`);
  } finally {
    await client.end();
  }
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for database-backed tests.`);
  return value;
}
