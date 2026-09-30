import { err, ok, Result } from 'neverthrow';

import { InvalidCurrencyCodeError } from '../errors/rate-plan.errors';
import { isPayableCurrency } from './payable-currency';

export class CurrencyCode {
  private constructor(public readonly value: string) {}

  static create(value: string): Result<CurrencyCode, InvalidCurrencyCodeError> {
    const normalized = value.trim().toUpperCase();

    if (!isPayableCurrency(normalized)) {
      return err(new InvalidCurrencyCodeError(value));
    }

    return ok(new CurrencyCode(normalized));
  }
}
