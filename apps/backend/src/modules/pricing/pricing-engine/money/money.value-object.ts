import Decimal from 'decimal.js';

// Prisma stores rates at up to 65 digits. Keep intermediate products and
// allocations exact at that scale before settling to payable cents.
const ExactDecimal = Decimal.clone({ precision: 200, rounding: Decimal.ROUND_HALF_UP });

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

    const value = new ExactDecimal(amount);

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

  static settle(amount: Money): Money {
    return new Money(new ExactDecimal(amount.amount.toFixed(2, Decimal.ROUND_HALF_UP)), amount.currency);
  }

  isPayable(): boolean {
    return this.amount.mul(100).isInteger();
  }

  toExactString(): string {
    return this.amount.toFixed(this.amount.decimalPlaces());
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
    const value = new ExactDecimal(factor);

    if (!value.isFinite() || value.isNegative()) {
      throw new Error(`Money multiplier must be a non-negative decimal: ${factor}`);
    }

    return new Money(this.amount.mul(value), this.currency);
  }

  allocateByRatios(ratios: Array<Decimal | string | number>, keys: string[]): Money[] {
    if (ratios.length === 0 || keys.length !== ratios.length || new Set(keys).size !== keys.length) {
      throw new Error('Allocation requires nonempty ratios and distinct stable line keys.');
    }
    if (!this.isPayable()) {
      throw new Error('Only payable amounts can be allocated.');
    }

    const weights = ratios.map((ratio) => new ExactDecimal(ratio));
    if (weights.some((weight) => !weight.isFinite() || weight.isNegative())) {
      throw new Error('Allocation ratios must be finite and non-negative.');
    }
    const sum = weights.reduce((total, weight) => total.plus(weight), new ExactDecimal(0));
    if (sum.isZero() && !this.isZero()) {
      throw new Error('A positive allocation requires a positive ratio.');
    }
    const cents = this.amount.mul(100);
    const shares = weights.map((weight, index) => {
      const numerator = cents.mul(weight);
      return {
        key: keys[index],
        units: sum.isZero() ? new ExactDecimal(0) : numerator.divToInt(sum),
        remainder: sum.isZero() ? new ExactDecimal(0) : numerator.mod(sum),
      };
    });
    let remainder = cents
      .minus(shares.reduce((total, share) => total.plus(share.units), new ExactDecimal(0)))
      .toNumber();
    for (const share of [...shares].sort((a, b) => {
      const difference = b.remainder.comparedTo(a.remainder);
      if (difference !== 0) return difference;
      if (a.key < b.key) return -1;
      if (a.key > b.key) return 1;
      return 0;
    })) {
      if (remainder <= 0) break;
      share.units = share.units.plus(1);
      remainder -= 1;
    }
    return shares.map((share) => new Money(share.units.div(100), this.currency));
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
    if (!this.isPayable()) throw new Error('Cannot snapshot an unsettled monetary amount.');
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
