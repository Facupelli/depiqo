import { addDaysToLocalDate, localDateStartInstant } from '@repo/temporal';

import { localDateDayOfWeek } from 'src/core/temporal/local-date';

import { InvalidPricingInputError } from '../errors/pricing.errors';
import { BillingUnit } from '../shared/billing-unit.type';
import { DailyBillingPolicy } from '../shared/daily-billing-unit-policy.type';
import { toLocalDate } from '../shared/local-date';

type RentalDurationCalculatorInput = {
  start: Date;
  end: Date;
  billingUnit: BillingUnit;
  dailyBillingPolicy: DailyBillingPolicy;
  minimumChargedDays: number;
  halfDayThresholdMinutes?: number;
  timezone: string;
  weekendCountsAsOne: boolean;
};

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

export class RentalDurationCalculator {
  calculateChargedUnits(input: RentalDurationCalculatorInput): number {
    this.validateInput(input);

    const durationMinutes = this.calculateDurationMinutes(input.start, input.end);

    switch (input.billingUnit) {
      case 'HOUR':
        return this.calculateHourlyUnits(durationMinutes);

      case 'DAY':
        return this.calculateDailyUnits({
          durationMinutes,
          dailyBillingPolicy: input.dailyBillingPolicy,
          minimumChargedDays: input.minimumChargedDays,
          halfDayThresholdMinutes: input.halfDayThresholdMinutes,
          start: input.start,
          end: input.end,
          timezone: input.timezone,
          weekendCountsAsOne: input.weekendCountsAsOne,
        });

      case 'WEEK':
        return this.calculateWeeklyUnits(durationMinutes);

      default:
        return this.assertNever(input.billingUnit);
    }
  }

  calculateChargedDays(input: Omit<RentalDurationCalculatorInput, 'billingUnit'>): number {
    this.validateInput({ ...input, billingUnit: 'DAY' });

    const durationMinutes = this.calculateDurationMinutes(input.start, input.end);

    return this.calculateDailyUnits({
      durationMinutes,
      dailyBillingPolicy: input.dailyBillingPolicy,
      minimumChargedDays: input.minimumChargedDays,
      halfDayThresholdMinutes: input.halfDayThresholdMinutes,
      start: input.start,
      end: input.end,
      timezone: input.timezone,
      weekendCountsAsOne: input.weekendCountsAsOne,
    });
  }

  private calculateDurationMinutes(start: Date, end: Date): number {
    const durationMs = end.getTime() - start.getTime();

    return Math.ceil(durationMs / 1000 / 60);
  }

  private calculateHourlyUnits(durationMinutes: number): number {
    return Math.max(1, Math.ceil(durationMinutes / MINUTES_PER_HOUR));
  }

  private calculateWeeklyUnits(durationMinutes: number): number {
    return Math.max(1, Math.ceil(durationMinutes / MINUTES_PER_WEEK));
  }

  private calculateDailyUnits(input: {
    durationMinutes: number;
    dailyBillingPolicy: DailyBillingPolicy;
    minimumChargedDays: number;
    halfDayThresholdMinutes?: number;
    start: Date;
    end: Date;
    timezone: string;
    weekendCountsAsOne: boolean;
  }): number {
    const fullDays = Math.floor(input.durationMinutes / MINUTES_PER_DAY);
    const remainingMinutes = input.durationMinutes % MINUTES_PER_DAY;

    let chargedDays: number;

    switch (input.dailyBillingPolicy) {
      case 'IGNORE_PARTIAL_DAY':
        chargedDays = fullDays;
        break;

      case 'BILL_OVER_HALF_DAY':
        chargedDays = this.calculateBillOverHalfDayUnits({
          fullDays,
          remainingMinutes,
          halfDayThresholdMinutes: input.halfDayThresholdMinutes,
        });
        break;

      case 'BILL_ANY_PARTIAL_DAY':
        chargedDays = remainingMinutes > 0 ? fullDays + 1 : fullDays;
        break;

      default:
        return this.assertNever(input.dailyBillingPolicy);
    }

    const normalChargedDays = Math.max(input.minimumChargedDays, chargedDays);
    if (!input.weekendCountsAsOne) return normalChargedDays;

    return Math.max(input.minimumChargedDays, normalChargedDays - this.countQualifyingWeekendPairs(input));
  }

  /**
   * Calendar dates identify an adjustment only. Daily units remain calculated
   * from elapsed duration and the selected daily billing policy.
   */
  private countQualifyingWeekendPairs(input: { start: Date; end: Date; timezone: string }): number {
    const firstLocalDate = toLocalDate(input.start, input.timezone);
    const lastLocalDate = toLocalDate(input.end, input.timezone);
    let candidateDate = firstLocalDate;
    let count = 0;

    while (candidateDate <= lastLocalDate) {
      if (localDateDayOfWeek(candidateDate) === 6) {
        const sunday = addDaysToLocalDate(candidateDate, 1);
        if (
          this.hasPositiveOverlapWithLocalDay(input, candidateDate) &&
          this.hasPositiveOverlapWithLocalDay(input, sunday)
        ) {
          count += 1;
        }
      }
      candidateDate = addDaysToLocalDate(candidateDate, 1);
    }

    return count;
  }

  private hasPositiveOverlapWithLocalDay(
    input: { start: Date; end: Date; timezone: string },
    localDate: string,
  ): boolean {
    const dayStart = localDateStartInstant(localDate, input.timezone);
    const nextDayStart = localDateStartInstant(addDaysToLocalDate(localDate, 1), input.timezone);

    return input.start < nextDayStart && input.end > dayStart;
  }

  private calculateBillOverHalfDayUnits(input: {
    fullDays: number;
    remainingMinutes: number;
    halfDayThresholdMinutes?: number;
  }): number {
    if (input.halfDayThresholdMinutes == null) {
      throw new InvalidPricingInputError('Half-day threshold minutes must be provided for BILL_OVER_HALF_DAY policy.');
    }

    if (input.remainingMinutes > input.halfDayThresholdMinutes) {
      return input.fullDays + 1;
    }

    return input.fullDays;
  }

  private validateInput(input: RentalDurationCalculatorInput): void {
    if (!(input.start instanceof Date) || Number.isNaN(input.start.getTime())) {
      throw new InvalidPricingInputError('Rental period start must be a valid Date.');
    }

    if (!(input.end instanceof Date) || Number.isNaN(input.end.getTime())) {
      throw new InvalidPricingInputError('Rental period end must be a valid Date.');
    }

    if (input.end <= input.start) {
      throw new InvalidPricingInputError('Rental period end must be after rental period start.');
    }

    if (!Number.isInteger(input.minimumChargedDays) || input.minimumChargedDays < 1) {
      throw new InvalidPricingInputError('Minimum charged days must be an integer greater than or equal to 1.');
    }

    if (!input.timezone.trim()) {
      throw new InvalidPricingInputError('Pricing timezone is required.');
    }

    if (input.dailyBillingPolicy === 'BILL_OVER_HALF_DAY') {
      if (
        !input.halfDayThresholdMinutes ||
        !Number.isInteger(input.halfDayThresholdMinutes) ||
        input.halfDayThresholdMinutes <= 0
      ) {
        throw new InvalidPricingInputError(
          'Half-day threshold minutes must be provided and greater than zero for BILL_OVER_HALF_DAY policy.',
        );
      }
    }
  }

  private assertNever(value: never): never {
    throw new InvalidPricingInputError(`Unsupported billing unit or daily billing policy: ${String(value)}.`);
  }
}
