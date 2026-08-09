import { mapPostgresError, PostgresExclusionViolationError } from './postgres-error.mapper';

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
