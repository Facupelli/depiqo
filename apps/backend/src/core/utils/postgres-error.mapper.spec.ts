import {
  isPrismaRawQueryPostgresDeadlock,
  isUniqueConstraintViolation,
  mapPostgresError,
  PostgresExclusionViolationError,
} from './postgres-error.mapper';

describe('mapPostgresError', () => {
  it('maps a direct PostgreSQL exclusion violation and preserves its cause', () => {
    const error = { code: '23P01', detail: 'private database detail' };

    expectMappedExclusionViolation(error);
  });

  it('maps the Prisma P2010 PostgreSQL adapter shape by cause code', () => {
    const error = prismaRawQueryError({ kind: 'postgres', code: '23P01' });

    expectMappedExclusionViolation(error);
  });

  it('maps the Prisma P2010 PostgreSQL adapter shape by original code', () => {
    const error = prismaRawQueryError({ kind: 'postgres', originalCode: '23P01' });

    expectMappedExclusionViolation(error);
  });

  it.each([
    ['an unrelated P2010', prismaRawQueryError({ kind: 'postgres', code: '23505' })],
    ['a non-PostgreSQL adapter cause', prismaRawQueryError({ kind: 'mysql', code: '23P01' })],
    ['missing adapter metadata', { code: 'P2010', meta: {} }],
    ['malformed adapter metadata', { code: 'P2010', meta: { driverAdapterError: { cause: null } } }],
    [
      'an unrelated Prisma error',
      { code: 'P2003', meta: { driverAdapterError: { cause: { kind: 'postgres', code: '23P01' } } } },
    ],
  ])('rethrows %s unchanged', (_name, error) => {
    try {
      mapPostgresError(error);
      throw new Error('Expected mapPostgresError to throw.');
    } catch (thrownError) {
      expect(thrownError).toBe(error);
    }
  });
});

describe('isPrismaRawQueryPostgresDeadlock', () => {
  it('matches the PostgreSQL adapter cause code', () => {
    expect(isPrismaRawQueryPostgresDeadlock(prismaRawQueryError({ kind: 'postgres', code: '40P01' }))).toBe(true);
  });

  it('matches the PostgreSQL adapter original code', () => {
    expect(isPrismaRawQueryPostgresDeadlock(prismaRawQueryError({ kind: 'postgres', originalCode: '40P01' }))).toBe(
      true,
    );
  });

  it.each([
    ['an exclusion violation', prismaRawQueryError({ kind: 'postgres', code: '23P01' })],
    ['an unrelated P2010', prismaRawQueryError({ kind: 'postgres', code: '23505' })],
    ['P2028', { code: 'P2028', meta: { driverAdapterError: { cause: { kind: 'postgres', code: '40P01' } } } }],
    ['P2034', { code: 'P2034', meta: { driverAdapterError: { cause: { kind: 'postgres', code: '40P01' } } } }],
    ['missing metadata', { code: 'P2010' }],
    ['malformed metadata', { code: 'P2010', meta: { driverAdapterError: { cause: null } } }],
    ['a non-PostgreSQL cause', prismaRawQueryError({ kind: 'mysql', code: '40P01' })],
  ])('does not match %s', (_name, error) => {
    expect(isPrismaRawQueryPostgresDeadlock(error)).toBe(false);
  });
});

const RENTAL_OFFER_UNIQUE_COLUMNS = ['tenant_id', 'branch_id', 'rentable_item_id'];

describe('isUniqueConstraintViolation', () => {
  it('matches a standard meta.target with camelCase field names', () => {
    const error = { code: 'P2002', meta: { target: ['tenantId', 'branchId', 'rentableItemId'] } };

    expect(isUniqueConstraintViolation(error, RENTAL_OFFER_UNIQUE_COLUMNS)).toBe(true);
  });

  it('matches the driver-adapter shape with database column names', () => {
    const error = {
      code: 'P2002',
      meta: {
        driverAdapterError: {
          cause: {
            kind: 'postgres',
            code: '23505',
            constraint: { fields: ['tenant_id', 'branch_id', 'rentable_item_id'] },
          },
        },
      },
    };

    expect(isUniqueConstraintViolation(error, RENTAL_OFFER_UNIQUE_COLUMNS)).toBe(true);
  });

  it('does not match a violation on different columns', () => {
    const error = { code: 'P2002', meta: { target: ['tenantId', 'email'] } };

    expect(isUniqueConstraintViolation(error, RENTAL_OFFER_UNIQUE_COLUMNS)).toBe(false);
  });

  it.each([
    ['a non-P2002 error', { code: 'P2003', meta: { target: ['tenantId', 'branchId', 'rentableItemId'] } }],
    ['missing metadata', { code: 'P2002' }],
    ['malformed metadata', { code: 'P2002', meta: { target: null, driverAdapterError: { cause: null } } }],
    ['non-string constraint fields', { code: 'P2002', meta: { target: [1, 2, 3] } }],
  ])('rejects %s', (_name, error) => {
    expect(isUniqueConstraintViolation(error, RENTAL_OFFER_UNIQUE_COLUMNS)).toBe(false);
  });
});

function expectMappedExclusionViolation(error: unknown): void {
  try {
    mapPostgresError(error);
    throw new Error('Expected mapPostgresError to throw.');
  } catch (mappedError) {
    expect(mappedError).toBeInstanceOf(PostgresExclusionViolationError);
    expect((mappedError as PostgresExclusionViolationError).cause).toBe(error);
  }
}

function prismaRawQueryError(cause: Record<string, unknown>): Record<string, unknown> {
  return {
    code: 'P2010',
    meta: {
      driverAdapterError: { cause },
    },
  };
}
