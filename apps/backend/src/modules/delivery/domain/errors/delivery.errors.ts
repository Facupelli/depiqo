export abstract class DeliveryDomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidCurrencyCodeError extends DeliveryDomainError {
  constructor(currency: string) {
    super(`Currency "${currency}" must be an uppercase 3-letter code.`);
  }
}

export class InvalidNonNegativeMoneyAmountError extends DeliveryDomainError {
  constructor(field: string) {
    super(`${field} must be a finite, non-negative monetary amount.`);
  }
}

export class InvalidMinuteOfDayWindowError extends DeliveryDomainError {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidDeliveryConfigurationError extends DeliveryDomainError {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidDeliveryQuoteInputError extends DeliveryDomainError {
  constructor(message: string) {
    super(message);
  }
}
