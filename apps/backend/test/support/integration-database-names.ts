import { randomBytes } from 'node:crypto';

export const TEST_DATABASE_PREFIX = 'depiqo_test_';
const ID_PATTERN = /^[0-9a-f]+$/;
const RUN_ID_BYTES = 6;
const CASE_ID_BYTES = 8;

export function createIntegrationRunId(): string {
  return randomBytes(RUN_ID_BYTES).toString('hex');
}

export function createIntegrationCaseId(): string {
  return randomBytes(CASE_ID_BYTES).toString('hex');
}

export function integrationRunDatabaseName(runId: string): string {
  assertCompactId(runId, RUN_ID_BYTES * 2, 'run');
  return assertValidDatabaseName(`${TEST_DATABASE_PREFIX}${runId}`);
}

export function integrationTemplateDatabaseName(runId: string): string {
  return assertValidDatabaseName(`${integrationRunDatabaseName(runId)}_tpl`);
}

export function integrationCaseDatabaseName(runId: string, caseId: string): string {
  assertCompactId(runId, RUN_ID_BYTES * 2, 'run');
  assertCompactId(caseId, CASE_ID_BYTES * 2, 'case');
  return assertValidDatabaseName(`${TEST_DATABASE_PREFIX}${runId}_c_${caseId}`);
}

export function assertDatabaseOwnedByRun(databaseName: string, runId: string): void {
  if (databaseName === 'postgres' || databaseName !== integrationRunDatabaseName(runId)) {
    throw new Error('Database is not the primary database owned by this test run.');
  }
}

export function assertTemplateOwnedByRun(databaseName: string, runId: string): void {
  if (databaseName === 'postgres' || databaseName !== integrationTemplateDatabaseName(runId)) {
    throw new Error('Template database is not owned by this integration test run.');
  }
}

export function assertCaseOwnedByRun(databaseName: string, runId: string): void {
  const prefix = `${TEST_DATABASE_PREFIX}${runId}_c_`;
  const caseId = databaseName.startsWith(prefix) ? databaseName.slice(prefix.length) : '';
  if (databaseName === 'postgres' || databaseName !== integrationCaseDatabaseName(runId, caseId)) {
    throw new Error('Database is not a case clone owned by this integration test run.');
  }
}

function assertCompactId(value: string, expectedLength: number, kind: string): void {
  if (value.length !== expectedLength || !ID_PATTERN.test(value)) {
    throw new Error(`Invalid integration test ${kind} id.`);
  }
}

function assertValidDatabaseName(name: string): string {
  if (!name.startsWith(TEST_DATABASE_PREFIX) || Buffer.byteLength(name, 'utf8') > 63) {
    throw new Error('Invalid integration test database name.');
  }
  return name;
}
