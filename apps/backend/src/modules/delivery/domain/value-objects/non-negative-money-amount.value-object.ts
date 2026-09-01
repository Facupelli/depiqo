import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { InvalidNonNegativeMoneyAmountError } from '../errors/delivery.errors';

export class NonNegativeMoneyAmount {
  private constructor(private readonly amount: Decimal) {}

  static create(value: string, field: string): Result<NonNegativeMoneyAmount, InvalidNonNegativeMoneyAmountError> {
    let amount: Decimal;

    try {
      amount = new Decimal(value);
    } catch {
      return err(new InvalidNonNegativeMoneyAmountError(field));
    }

    if (!amount.isFinite() || amount.isNegative()) {
      return err(new InvalidNonNegativeMoneyAmountError(field));
    }

    return ok(new NonNegativeMoneyAmount(amount));
  }

  toString(): string {
    return this.amount.toString();
  }
}
