import { GetRentalsCalendarQuerySchema, LocalDateSchema } from '@repo/api-contracts';
import { spawnSync } from 'child_process';
import { join } from 'path';

import { localDateDayOfWeek, localDateToPrismaDate, prismaDateToLocalDate } from './local-date';

describe('LocalDate', () => {
  it.each(['2026-08-10T00:00:00Z', '2026-08-10T10:00:00-03:00', '2026-02-30', '2026-2-10', 'not-a-date'])(
    'rejects non-calendar-date input: %s',
    (value) => {
      expect(() => LocalDateSchema.parse(value)).toThrow();
    },
  );

  it('accepts an ISO calendar date', () => {
    expect(LocalDateSchema.parse('2026-08-10')).toBe('2026-08-10');
  });

  it('round-trips a LocalDate through Prisma DATE transport without timezone interpretation', () => {
    const localDate = LocalDateSchema.parse('2026-08-10');

    expect(prismaDateToLocalDate(localDateToPrismaDate(localDate))).toBe(localDate);
  });

  it('keeps birth dates and branch override dates stable in a non-UTC process timezone', () => {
    const modulePath = join(process.cwd(), 'src/core/temporal/local-date.ts');
    const result = spawnSync(
      process.execPath,
      [
        '-r',
        'ts-node/register',
        '-e',
        `const { localDateToPrismaDate, prismaDateToLocalDate } = require(${JSON.stringify(modulePath)}); const value = '1990-03-15'; const override = '2026-08-10'; process.stdout.write([prismaDateToLocalDate(localDateToPrismaDate(value)), prismaDateToLocalDate(localDateToPrismaDate(override))].join(','));`,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, TZ: 'America/Argentina/Buenos_Aires' },
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('1990-03-15,2026-08-10');
  });

  it('keeps rental-calendar request dates as strict LocalDate values', () => {
    expect(GetRentalsCalendarQuerySchema.parse({ branchId: 'branch-1', from: '2026-08-10', to: '2026-08-12' })).toEqual(
      {
        branchId: 'branch-1',
        from: '2026-08-10',
        to: '2026-08-12',
      },
    );
    expect(() =>
      GetRentalsCalendarQuerySchema.parse({
        branchId: 'branch-1',
        from: '2026-08-10T00:00:00Z',
        to: '2026-08-12',
      }),
    ).toThrow();
  });

  it('calculates weekdays as calendar operations without creating an instant', () => {
    expect(localDateDayOfWeek(LocalDateSchema.parse('2026-08-10'))).toBe(1);
  });
});
