import { err, ok, Result } from 'neverthrow';

import { InvalidCurrencyCodeError } from '../errors/rate-plan.errors';

export class CurrencyCode {
  private constructor(public readonly value: string) {}

  static create(value: string): Result<CurrencyCode, InvalidCurrencyCodeError> {
    const normalized = value.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalized)) {
      return err(new InvalidCurrencyCodeError(value));
    }

    return ok(new CurrencyCode(normalized));
  }
}
