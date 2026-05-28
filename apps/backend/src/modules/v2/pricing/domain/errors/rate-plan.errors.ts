export abstract class RatePlanDomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidRatePlanNameError extends RatePlanDomainError {
  constructor() {
    super('Rate plan name is required.');
  }
}

export class InvalidCurrencyCodeError extends RatePlanDomainError {
  constructor(currency: string) {
    super(`Currency "${currency}" must be an ISO-4217 3-letter code.`);
  }
}

export class InvalidRatePlanTierRangeError extends RatePlanDomainError {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidRatePlanTierPriceError extends RatePlanDomainError {
  constructor() {
    super('Rate plan tier price per unit must be greater than zero.');
  }
}

export class RatePlanMustHaveAtLeastOneTierError extends RatePlanDomainError {
  constructor() {
    super('A rate plan must have at least one tier.');
  }
}

export class DuplicateRatePlanTierFromUnitError extends RatePlanDomainError {
  constructor(fromUnit: number) {
    super(`Rate plan tiers cannot contain duplicate fromUnit "${fromUnit}".`);
  }
}

export class MultipleOpenEndedRatePlanTiersError extends RatePlanDomainError {
  constructor() {
    super('A rate plan can have only one open-ended tier.');
  }
}

export class OverlappingRatePlanTiersError extends RatePlanDomainError {
  constructor() {
    super('Rate plan tiers cannot overlap.');
  }
}

export class NonContiguousRatePlanTiersError extends RatePlanDomainError {
  constructor(expectedFromUnit: number, actualFromUnit: number) {
    super(
      `Rate plan tiers must be contiguous. Expected next fromUnit "${expectedFromUnit}" but received "${actualFromUnit}".`,
    );
  }
}
