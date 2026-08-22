// PostgreSQL SQLSTATE codes
const PG_EXCLUSION_VIOLATION = '23P01';

// Prisma error codes
const PRISMA_RAW_QUERY_FAILED = 'P2010';
const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const PRISMA_FOREIGN_KEY_VIOLATION = 'P2003';

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
  return isErrorWithCode(error) && error.code === PRISMA_FOREIGN_KEY_VIOLATION;
}

/**
 * Detects a Prisma unique constraint violation (P2002) on a specific set of
 * database columns. Callers use this as a race backstop after an application
 * pre-check, so the expected columns must match the violated constraint exactly.
 *
 * Handles both the standard `meta.target` shape and the driver-adapter shape
 * (`meta.driverAdapterError.cause.constraint.fields`). Field names are
 * normalized to their database (snake_case) form before comparison.
 */
export function isUniqueConstraintViolation(error: unknown, expectedColumns: readonly string[]): boolean {
  if (!isRecord(error) || error.code !== PRISMA_UNIQUE_CONSTRAINT_VIOLATION || !isRecord(error.meta)) {
    return false;
  }

  const violatedColumns = violatedUniqueConstraintColumns(error.meta);
  return (
    violatedColumns.length === expectedColumns.length &&
    violatedColumns.every((column) => expectedColumns.includes(column))
  );
}

/**
 * Reads the columns of the violated unique constraint from either metadata
 * shape and normalizes them to database (snake_case) column names.
 */
function violatedUniqueConstraintColumns(meta: Record<string, unknown>): string[] {
  const fields = uniqueConstraintFields(meta);
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields.filter((field): field is string => typeof field === 'string').map(toDatabaseColumnName);
}

function uniqueConstraintFields(meta: Record<string, unknown>): unknown {
  const target = meta.target;
  if (target !== undefined && target !== null) {
    return target;
  }

  // Driver-adapter shape: meta.driverAdapterError.cause.constraint.fields
  const adapterError = meta.driverAdapterError;
  if (!isRecord(adapterError)) {
    return undefined;
  }
  const adapterCause = adapterError.cause;
  if (!isRecord(adapterCause)) {
    return undefined;
  }
  const constraint = adapterCause.constraint;
  if (!isRecord(constraint)) {
    return undefined;
  }

  return constraint.fields;
}

function toDatabaseColumnName(field: string): string {
  return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
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
