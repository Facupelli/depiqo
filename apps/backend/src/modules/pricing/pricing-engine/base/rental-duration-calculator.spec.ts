import { RentalDurationCalculator } from './rental-duration-calculator';

describe('RentalDurationCalculator weekend adjustment', () => {
  const calculator = new RentalDurationCalculator();
  const timezone = 'America/Argentina/Buenos_Aires';

  function calculate(input: {
    start: string;
    end: string;
    billingUnit?: 'DAY' | 'HOUR' | 'WEEK';
    weekendCountsAsOne?: boolean;
  }): number {
    return calculator.calculateChargedUnits({
      start: new Date(input.start),
      end: new Date(input.end),
      billingUnit: input.billingUnit ?? 'DAY',
      dailyBillingPolicy: 'BILL_ANY_PARTIAL_DAY',
      weekendCountsAsOne: input.weekendCountsAsOne ?? true,
      timezone,
      minimumChargedDays: 1,
    });
  }

  it.each([
    ['Saturday to Sunday', '2026-08-08T10:00:00-03:00', '2026-08-09T18:00:00-03:00', 1],
    ['Saturday to Sunday at the same time', '2026-08-08T10:00:00-03:00', '2026-08-09T10:00:00-03:00', 1],
    ['Saturday to Monday', '2026-08-08T10:00:00-03:00', '2026-08-10T10:00:00-03:00', 1],
    ['Friday to Monday', '2026-08-07T10:00:00-03:00', '2026-08-10T10:00:00-03:00', 2],
  ])('charges elapsed daily units less one for a qualifying weekend pair: %s', (_name, start, end, expected) => {
    expect(calculate({ start, end })).toBe(expected);
  });

  it('does not adjust a Saturday-only or Sunday-only rental', () => {
    expect(calculate({ start: '2026-08-08T10:00:00-03:00', end: '2026-08-08T18:00:00-03:00' })).toBe(1);
    expect(calculate({ start: '2026-08-09T10:00:00-03:00', end: '2026-08-09T18:00:00-03:00' })).toBe(1);
  });

  it('preserves normal daily billing when weekend mode is disabled', () => {
    expect(
      calculate({
        start: '2026-08-08T10:00:00-03:00',
        end: '2026-08-09T18:00:00-03:00',
        weekendCountsAsOne: false,
      }),
    ).toBe(2);
  });

  it('does not adjust hourly or weekly rate plans', () => {
    expect(
      calculate({
        start: '2026-08-08T10:00:00-03:00',
        end: '2026-08-09T18:00:00-03:00',
        billingUnit: 'HOUR',
      }),
    ).toBe(32);
    expect(
      calculate({
        start: '2026-08-08T10:00:00-03:00',
        end: '2026-08-16T10:00:00-03:00',
        billingUnit: 'WEEK',
      }),
    ).toBe(2);
  });

  it('uses the effective timezone to find a qualifying pair', () => {
    expect(
      calculate({
        start: '2026-08-08T02:00:00Z',
        end: '2026-08-10T02:00:00Z',
      }),
    ).toBe(1);
  });

  it('finds a qualifying pair across a DST transition without changing elapsed billing', () => {
    const newYorkCalculator = new RentalDurationCalculator();

    expect(
      newYorkCalculator.calculateChargedUnits({
        start: new Date('2026-03-07T10:00:00-05:00'),
        end: new Date('2026-03-08T18:00:00-04:00'),
        billingUnit: 'DAY',
        dailyBillingPolicy: 'BILL_ANY_PARTIAL_DAY',
        weekendCountsAsOne: true,
        timezone: 'America/New_York',
        minimumChargedDays: 1,
      }),
    ).toBe(1);
  });
});
