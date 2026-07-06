import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { InvalidRatePlanTierPriceError } from '../errors/rate-plan.errors';

export class PricePerUnit {
  private constructor(private readonly amount: Decimal) {}

  static create(value: string): Result<PricePerUnit, InvalidRatePlanTierPriceError> {
    let amount: Decimal;

    try {
      amount = new Decimal(value);
    } catch {
      return err(new InvalidRatePlanTierPriceError());
    }

    if (!amount.isFinite() || amount.lessThanOrEqualTo(0)) {
      return err(new InvalidRatePlanTierPriceError());
    }

    return ok(new PricePerUnit(amount));
  }

  toString(): string {
    return this.amount.toString();
  }
}
