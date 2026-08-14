// Postgres error code for exclusion constraint violation (gist overlap)
const PG_EXCLUSION_VIOLATION = '23P01';
const PRISMA_RAW_QUERY_FAILED = 'P2010';
const PG_FOREIGN_KEY_VIOLATION = 'P2003';

/**
 * Typed error thrown when a Postgres EXCLUDE constraint fires.
 * Callers catch this specifically — it is not a generic DB error.
 */
export class PostgresExclusionViolationError extends Error {
  constructor(cause: unknown) {
    super('A database exclusion constraint was violated.', { cause });
    this.name = 'PostgresExclusionViolationError';
  }
}

export function isForeignKeyConstraintError(error: unknown): boolean {
  return isErrorWithCode(error) && error.code === PG_FOREIGN_KEY_VIOLATION;
}

type ErrorWithCode = {
  code: string;
};

function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return isRecord(error) && typeof error.code === 'string';
}

function isPrismaWrappedPostgresExclusionViolation(error: unknown): boolean {
  if (!isRecord(error) || error.code !== PRISMA_RAW_QUERY_FAILED || !isRecord(error.meta)) {
    return false;
  }

  const driverAdapterError = error.meta.driverAdapterError;
  if (!isRecord(driverAdapterError) || !isRecord(driverAdapterError.cause)) {
    return false;
  }

  const adapterCause = driverAdapterError.cause;
  return (
    adapterCause.kind === 'postgres' &&
    (adapterCause.code === PG_EXCLUSION_VIOLATION || adapterCause.originalCode === PG_EXCLUSION_VIOLATION)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Maps known Postgres error codes to typed domain errors.
 * Always re-throws — either as a typed error or as the original unknown error.
 *
 * Usage:
 *   try {
 *     await prisma.$executeRaw`INSERT ...`
 *   } catch (error) {
 *     mapPostgresError(error); // throws PostgresExclusionViolationError or re-throws original
 *   }
 */
export function mapPostgresError(error: unknown): never {
  if (
    (isErrorWithCode(error) && error.code === PG_EXCLUSION_VIOLATION) ||
    isPrismaWrappedPostgresExclusionViolation(error)
  ) {
    throw new PostgresExclusionViolationError(error);
  }
  throw error;
}
