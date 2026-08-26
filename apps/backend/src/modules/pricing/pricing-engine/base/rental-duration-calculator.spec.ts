import { RentalDurationCalculator } from './rental-duration-calculator';

describe('RentalDurationCalculator daily billing thresholds', () => {
  const calculator = new RentalDurationCalculator();
  const start = new Date('2026-01-05T00:00:00Z');

  function calculateDaily(input: {
    durationMinutes: number;
    dailyBillingPolicy: 'BILL_OVER_QUARTER_DAY' | 'BILL_OVER_HALF_DAY';
    minimumChargedDays?: number;
  }): number {
    return calculator.calculateChargedUnits({
      start,
      end: new Date(start.getTime() + input.durationMinutes * 60_000),
      billingUnit: 'DAY',
      dailyBillingPolicy: input.dailyBillingPolicy,
      quarterDayThresholdMinutes: 360,
      halfDayThresholdMinutes: 720,
      weekendCountsAsOne: false,
      timezone: 'UTC',
      minimumChargedDays: input.minimumChargedDays ?? 1,
    });
  }

  it.each([
    [1, 359, 1],
    [1, 360, 1],
    [1, 361, 2],
    [2, 361, 3],
  ])('charges %i full day(s) plus a %i-minute remainder as %i day(s)', (fullDays, remainingMinutes, expected) => {
    expect(
      calculateDaily({
        durationMinutes: fullDays * 1_440 + remainingMinutes,
        dailyBillingPolicy: 'BILL_OVER_QUARTER_DAY',
      }),
    ).toBe(expected);
  });

  it.each([
    [720, 1],
    [721, 2],
  ])('preserves the strict half-day boundary at a remainder of %i minutes', (remainingMinutes, expected) => {
    expect(
      calculateDaily({ durationMinutes: 1_440 + remainingMinutes, dailyBillingPolicy: 'BILL_OVER_HALF_DAY' }),
    ).toBe(expected);
  });

  it('applies minimum charged days after quarter-day calculation', () => {
    expect(
      calculateDaily({
        durationMinutes: 1_440 + 359,
        dailyBillingPolicy: 'BILL_OVER_QUARTER_DAY',
        minimumChargedDays: 3,
      }),
    ).toBe(3);
  });

  it.each([undefined, 0, -1, 1.5])('rejects an invalid quarter-day threshold of %s', (threshold) => {
    expect(() =>
      calculator.calculateChargedUnits({
        start,
        end: new Date(start.getTime() + 1_801 * 60_000),
        billingUnit: 'DAY',
        dailyBillingPolicy: 'BILL_OVER_QUARTER_DAY',
        quarterDayThresholdMinutes: threshold,
        weekendCountsAsOne: false,
        timezone: 'UTC',
        minimumChargedDays: 1,
      }),
    ).toThrow('Quarter-day threshold minutes must be provided and greater than zero for BILL_OVER_QUARTER_DAY policy.');
  });

  it('leaves hourly and weekly units unaffected by the quarter-day policy', () => {
    const commonInput = {
      start,
      dailyBillingPolicy: 'BILL_OVER_QUARTER_DAY' as const,
      quarterDayThresholdMinutes: 360,
      weekendCountsAsOne: true,
      timezone: 'UTC',
      minimumChargedDays: 5,
    };

    expect(
      calculator.calculateChargedUnits({
        ...commonInput,
        end: new Date(start.getTime() + 61 * 60_000),
        billingUnit: 'HOUR',
      }),
    ).toBe(2);
    expect(
      calculator.calculateChargedUnits({
        ...commonInput,
        end: new Date(start.getTime() + (7 * 1_440 + 1) * 60_000),
        billingUnit: 'WEEK',
      }),
    ).toBe(2);
  });
});

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

  it('applies the weekend adjustment after quarter-day billing without going below the minimum', () => {
    expect(
      calculator.calculateChargedUnits({
        start: new Date('2026-08-08T10:00:00-03:00'),
        end: new Date('2026-08-10T16:01:00-03:00'),
        billingUnit: 'DAY',
        dailyBillingPolicy: 'BILL_OVER_QUARTER_DAY',
        quarterDayThresholdMinutes: 360,
        weekendCountsAsOne: true,
        timezone,
        minimumChargedDays: 2,
      }),
    ).toBe(2);
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
