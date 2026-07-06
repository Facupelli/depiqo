import { err, ok, Result } from 'neverthrow';

import { InvalidRatePlanTierRangeError } from '../errors/rate-plan.errors';

export class RatePlanTierRange {
  private constructor(
    public readonly fromUnit: number,
    public readonly toUnit: number | null,
  ) {}

  static create(props: {
    fromUnit: number;
    toUnit?: number | null;
  }): Result<RatePlanTierRange, InvalidRatePlanTierRangeError> {
    const toUnit = props.toUnit ?? null;

    if (!Number.isInteger(props.fromUnit) || props.fromUnit < 1) {
      return err(new InvalidRatePlanTierRangeError('Rate plan tier fromUnit must be a positive integer.'));
    }

    if (toUnit !== null && (!Number.isInteger(toUnit) || toUnit < props.fromUnit)) {
      return err(new InvalidRatePlanTierRangeError('Rate plan tier toUnit must be greater than or equal to fromUnit.'));
    }

    return ok(new RatePlanTierRange(props.fromUnit, toUnit));
  }

  isOpenEnded(): boolean {
    return this.toUnit === null;
  }
}
