import { ConfigService } from '@nestjs/config';
import type { Provider } from '@nestjs/common';
import { Client } from 'pg';

import {
  assertCaseOwnedByRun,
  assertTemplateOwnedByRun,
  createIntegrationCaseId,
  integrationCaseDatabaseName,
} from './integration-database-names';

type Closable = { close(): Promise<void> };

/**
 * Registers an integration-test lifecycle with an isolated, migrated database.
 * The factory runs only after its clone exists, and its result is closed before
 * that clone is dropped.
 */
export function integrationConfigServiceProvider(): Provider {
  const values = { ...process.env };
  return {
    provide: ConfigService,
    useValue: {
      get: (key: string, defaultValue?: unknown) => values[key] ?? defaultValue,
    },
  };
}

export function useIntegrationTestContext<T extends Closable>(createContext: () => Promise<T>): void {
  let database: IntegrationTestDatabase | undefined;
  let context: T | undefined;

  beforeEach(async () => {
    database = await IntegrationTestDatabase.create();
    process.env.DATABASE_URL = database.url;

    try {
      context = await createContext();
    } catch (error) {
      await database.drop();
      database = undefined;
      throw error;
    }
  });

  afterEach(async () => {
    try {
      await context?.close();
    } finally {
      context = undefined;
      await database?.drop();
      database = undefined;
    }
  });
}

export type PostgreSqlSession = {
  pid: number;
  datname: string;
  application_name: string;
  state: string;
  backend_type: string;
  wait_event_type: string | null;
  wait_event: string | null;
  xact_start: Date | null;
  query_start: Date;
  query: string;
};

export class IntegrationTestDatabase {
  private constructor(
    readonly name: string,
    readonly url: string,
    private readonly adminUrl: string,
    private readonly templateName: string,
  ) {}

  static async create(): Promise<IntegrationTestDatabase> {
    const adminUrl = requiredEnv('TEST_DATABASE_ADMIN_URL');
    const templateName = requiredEnv('TEST_DATABASE_TEMPLATE_NAME');
    const runId = requiredEnv('TEST_DATABASE_RUN_ID');
    validateRunMetadata(adminUrl, templateName, runId);

    const name = integrationCaseDatabaseName(runId, createIntegrationCaseId());
    const client = new Client({ connectionString: adminUrl });
    const startedAt = performance.now();

    await client.connect();
    try {
      await client.query(`CREATE DATABASE ${quoteIdentifier(name)} TEMPLATE ${quoteIdentifier(templateName)}`);
    } finally {
      await client.end();
    }

    recordTiming('clone', performance.now() - startedAt);
    return new IntegrationTestDatabase(name, databaseUrlFor(adminUrl, name), adminUrl, templateName);
  }

  async drop(): Promise<void> {
    const runId = requiredEnv('TEST_DATABASE_RUN_ID');
    validateRunMetadata(this.adminUrl, this.templateName, runId);
    assertCaseOwnedByRun(this.name, runId);

    const client = new Client({ connectionString: this.adminUrl });
    const startedAt = performance.now();
    await client.connect();
    try {
      const sessions = await queryPostgreSqlSessions(client, this.name);
      if (sessions.length > 0) {
        throw new Error(`Refusing to drop ${this.name}; active sessions: ${JSON.stringify(sessions)}`);
      }
      await client.query(`DROP DATABASE ${quoteIdentifier(this.name)}`);
    } finally {
      await client.end();
    }
    recordTiming('drop', performance.now() - startedAt);
  }
}

function validateRunMetadata(adminUrl: string, templateName: string, runId: string): void {
  const adminDatabase = decodeURIComponent(new URL(adminUrl).pathname.slice(1));
  if (adminDatabase !== 'postgres') {
    throw new Error('TEST_DATABASE_ADMIN_URL must target the container postgres database.');
  }

  assertTemplateOwnedByRun(templateName, runId);
}

export async function getPostgreSqlSessions(adminUrl: string, databaseName: string): Promise<PostgreSqlSession[]> {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    return await queryPostgreSqlSessions(client, databaseName);
  } finally {
    await client.end();
  }
}

async function queryPostgreSqlSessions(client: Client, databaseName: string): Promise<PostgreSqlSession[]> {
  const result = await client.query<PostgreSqlSession>(
    `SELECT pid, datname, application_name, state, backend_type, wait_event_type, wait_event,
            xact_start, query_start, query
     FROM pg_stat_activity
     WHERE datname = $1
     ORDER BY pid`,
    [databaseName],
  );
  return result.rows;
}

function databaseUrlFor(adminUrl: string, databaseName: string): string {
  const url = new URL(adminUrl);
  url.pathname = `/${encodeURIComponent(databaseName)}`;
  return url.toString();
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for integration database tests.`);
  return value;
}

function recordTiming(operation: 'clone' | 'drop', durationMs: number): void {
  const timings = ((
    globalThis as typeof globalThis & { __integrationDatabaseTimings?: Record<string, number[]> }
  ).__integrationDatabaseTimings ??= { clone: [], drop: [] });
  timings[operation].push(durationMs);
}
