// src/modules/pricing/domain/money/money.ts

import Decimal from 'decimal.js';

export class Money {
  private static readonly DEFAULT_DECIMAL_PLACES = 2;

  readonly amount: Decimal;
  readonly currency: string;

  private constructor(amount: Decimal, currency: string) {
    this.amount = amount;
    this.currency = currency.toUpperCase();
  }

  static of(amount: Decimal | string, currency: string): Money {
    const normalizedCurrency = currency.trim().toUpperCase();

    if (!normalizedCurrency) {
      throw new Error('Currency is required.');
    }

    const value = new Decimal(amount);

    if (!value.isFinite()) {
      throw new Error(`Invalid monetary amount: ${amount}`);
    }

    if (value.isNegative()) {
      throw new Error(`Money amount cannot be negative: ${amount}`);
    }

    return new Money(value, normalizedCurrency);
  }

  static zero(currency: string): Money {
    return Money.of('0', currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);

    return new Money(this.amount.plus(other.amount), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);

    const result = this.amount.minus(other.amount);

    if (result.isNegative()) {
      throw new Error('Money subtraction cannot produce a negative result.');
    }

    return new Money(result, this.currency);
  }

  multiplyByInteger(factor: number): Money {
    if (!Number.isInteger(factor) || factor < 0) {
      throw new Error('Money multiplier must be a non-negative integer.');
    }

    return new Money(this.amount.mul(factor), this.currency);
  }

  multiplyByDecimal(factor: Decimal | string): Money {
    const value = new Decimal(factor);

    if (!value.isFinite() || value.isNegative()) {
      throw new Error(`Money multiplier must be a non-negative decimal: ${factor}`);
    }

    return new Money(this.amount.mul(value), this.currency);
  }

  allocateByRatios(ratios: number[], decimalPlaces = Money.DEFAULT_DECIMAL_PLACES): Money[] {
    if (ratios.length === 0) {
      throw new Error('At least one allocation ratio is required.');
    }

    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
      throw new Error('Money allocation decimal places must be a non-negative integer.');
    }

    if (ratios.some((ratio) => !Number.isInteger(ratio) || ratio < 0)) {
      throw new Error('Money allocation ratios must be non-negative integers.');
    }

    const totalRatio = ratios.reduce((total, ratio) => total + ratio, 0);

    if (totalRatio <= 0) {
      throw new Error('At least one allocation ratio must be greater than zero.');
    }

    const scale = new Decimal(10).pow(decimalPlaces);
    const totalMinorUnits = this.amount.mul(scale).floor();
    const allocatedMinorUnits: Decimal[] = [];

    let allocatedTotal = new Decimal(0);

    for (const ratio of ratios) {
      const share = totalMinorUnits.mul(ratio).div(totalRatio).floor();

      allocatedMinorUnits.push(share);
      allocatedTotal = allocatedTotal.plus(share);
    }

    let remainder = totalMinorUnits.minus(allocatedTotal).toNumber();
    let index = 0;

    while (remainder > 0) {
      if (ratios[index] > 0) {
        allocatedMinorUnits[index] = allocatedMinorUnits[index].plus(1);
        remainder -= 1;
      }

      index = (index + 1) % allocatedMinorUnits.length;
    }

    return allocatedMinorUnits.map((minorUnits) => new Money(minorUnits.div(scale), this.currency));
  }

  clampAbove(min: Money): Money {
    this.assertSameCurrency(min);

    return this.amount.greaterThanOrEqualTo(min.amount) ? this : min;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount.equals(other.amount);
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);

    return this.amount.greaterThan(other.amount);
  }

  isGreaterThanOrEqualTo(other: Money): boolean {
    this.assertSameCurrency(other);

    return this.amount.greaterThanOrEqualTo(other.amount);
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  toDecimal(): Decimal {
    return this.amount;
  }

  toSnapshotString(): string {
    return this.amount.toFixed(Money.DEFAULT_DECIMAL_PLACES);
  }

  toString(): string {
    return `${this.toSnapshotString()} ${this.currency}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: cannot operate on '${this.currency}' and '${other.currency}'.`);
    }
  }
}
