import { prismaDateToLocalDate, toLocalDate } from './local-date';

describe('local-date', () => {
  it('derives a branch-local date from an absolute instant', () => {
    const instant = new Date('2026-08-10T02:30:00.000Z');

    expect(toLocalDate(instant, 'America/Argentina/Buenos_Aires')).toBe('2026-08-09');
    expect(toLocalDate(instant, 'Europe/Madrid')).toBe('2026-08-10');
  });

  it('maps Prisma DATE values with UTC components rather than machine-local components', () => {
    expect(prismaDateToLocalDate(new Date('2026-08-10T00:00:00.000Z'))).toBe('2026-08-10');
  });
});
