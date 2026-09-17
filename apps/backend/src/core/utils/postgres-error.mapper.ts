// PostgreSQL SQLSTATE codes
const PG_EXCLUSION_VIOLATION = '23P01';
const PG_DEADLOCK_DETECTED = '40P01';

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
  if (!isPrismaErrorShape(error) || error.code !== PRISMA_UNIQUE_CONSTRAINT_VIOLATION) {
    return false;
  }
  if (!isPrismaErrorMetadata(error.meta)) {
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
function violatedUniqueConstraintColumns(meta: PrismaErrorMetadata): string[] {
  return uniqueConstraintFields(meta).map(toDatabaseColumnName);
}

function uniqueConstraintFields(meta: PrismaErrorMetadata): string[] {
  const target = meta.target;
  if (Array.isArray(target)) {
    return target.filter((field): field is string => typeof field === 'string');
  }

  // Driver-adapter shape: meta.driverAdapterError.cause.constraint.fields
  if (!isDriverAdapterError(meta.driverAdapterError)) {
    return [];
  }
  if (!isDriverAdapterCause(meta.driverAdapterError.cause)) {
    return [];
  }
  if (!isPostgresConstraint(meta.driverAdapterError.cause.constraint)) {
    return [];
  }

  const fields = meta.driverAdapterError.cause.constraint.fields;
  return Array.isArray(fields) ? fields.filter((field): field is string => typeof field === 'string') : [];
}

function toDatabaseColumnName(field: string): string {
  return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

interface PrismaErrorShape {
  code?: unknown;
  meta?: unknown;
}

interface PrismaErrorMetadata {
  target?: unknown;
  driverAdapterError?: unknown;
}

interface DriverAdapterError {
  cause?: unknown;
}

interface DriverAdapterCause {
  constraint?: unknown;
}

interface PostgresAdapterCause {
  kind?: unknown;
  code?: unknown;
  originalCode?: unknown;
}

interface PostgresConstraint {
  fields?: unknown;
}

type ErrorWithCode = PrismaErrorShape & {
  code: string;
};

function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return isPrismaErrorShape(error) && typeof error.code === 'string';
}

function isPrismaErrorShape(value: unknown): value is PrismaErrorShape {
  return isNonArrayObject(value) && hasKnownProperty(value, ['code', 'meta']);
}

function isPrismaErrorMetadata(value: unknown): value is PrismaErrorMetadata {
  return isNonArrayObject(value) && hasKnownProperty(value, ['target', 'driverAdapterError']);
}

function isDriverAdapterError(value: unknown): value is DriverAdapterError {
  return isNonArrayObject(value) && hasKnownProperty(value, ['cause']);
}

function isDriverAdapterCause(value: unknown): value is DriverAdapterCause {
  return isNonArrayObject(value) && hasKnownProperty(value, ['constraint']);
}

function isPostgresAdapterCause(value: unknown): value is PostgresAdapterCause {
  return (
    isNonArrayObject(value) &&
    hasKnownProperty(value, ['kind', 'code', 'originalCode']) &&
    Reflect.get(value, 'kind') === 'postgres'
  );
}

function isPostgresConstraint(value: unknown): value is PostgresConstraint {
  return isNonArrayObject(value) && hasKnownProperty(value, ['fields']);
}

function isNonArrayObject<T>(value: T): value is T & object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasKnownProperty<T>(value: T, properties: readonly string[]): boolean {
  return typeof value === 'object' && value !== null && properties.some((property) => Object.hasOwn(value, property));
}

function isPrismaWrappedPostgresExclusionViolation(error: unknown): boolean {
  const adapterCause = prismaRawQueryPostgresCause(error);
  return (
    adapterCause !== undefined &&
    (adapterCause.code === PG_EXCLUSION_VIOLATION || adapterCause.originalCode === PG_EXCLUSION_VIOLATION)
  );
}

/** Detects the verified Prisma raw-query wrapper for a PostgreSQL deadlock. */
export function isPrismaRawQueryPostgresDeadlock(error: unknown): boolean {
  const adapterCause = prismaRawQueryPostgresCause(error);
  return (
    adapterCause !== undefined &&
    (adapterCause.code === PG_DEADLOCK_DETECTED || adapterCause.originalCode === PG_DEADLOCK_DETECTED)
  );
}

function prismaRawQueryPostgresCause(error: unknown): PostgresAdapterCause | undefined {
  if (!isPrismaErrorShape(error) || error.code !== PRISMA_RAW_QUERY_FAILED) {
    return undefined;
  }
  if (!isPrismaErrorMetadata(error.meta) || !isDriverAdapterError(error.meta.driverAdapterError)) {
    return undefined;
  }

  const adapterCause = error.meta.driverAdapterError.cause;
  return isPostgresAdapterCause(adapterCause) ? adapterCause : undefined;
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
