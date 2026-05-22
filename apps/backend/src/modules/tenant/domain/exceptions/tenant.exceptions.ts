export class InvalidTenantNameException extends Error {
  constructor() {
    super('Tenant name cannot be empty.');
    this.name = 'InvalidTenantNameException';
  }
}

export class InvalidTenantSlugException extends Error {
  constructor() {
    super('Tenant slug cannot be empty.');
    this.name = 'InvalidTenantSlugException';
  }
}

export class BillingUnitAlreadyActiveException extends Error {
  constructor(billingUnitId: string) {
    super(`Billing unit '${billingUnitId}' is already active for this tenant.`);
    this.name = 'BillingUnitAlreadyActiveException';
  }
}

export class BillingUnitNotActiveException extends Error {
  constructor(billingUnitId: string) {
    super(`Billing unit '${billingUnitId}' is not active for this tenant.`);
    this.name = 'BillingUnitNotActiveException';
  }
}

export class InvalidTimezoneException extends Error {
  constructor(timezone: string) {
    super(`"${timezone}" is not a valid IANA timezone`);
  }
}

export class InvalidNewArrivalsWindowDaysException extends Error {
  constructor(days: number) {
    super(`newArrivalsWindowDays must be a positive integer, got ${days}`);
  }
}

export class InvalidDefaultCurrencyException extends Error {
  constructor(currency: string) {
    super(`"${currency}" is not a valid ISO 4217 currency code (expected 3 uppercase letters)`);
  }
}

export class InvalidMaxOverRentThresholdException extends Error {
  constructor(threshold: number) {
    super(`maxOverRentThreshold must be a non-negative number, got ${threshold}`);
  }
}

export class InvalidInsuranceRatePercentException extends Error {
  constructor(ratePercent: number) {
    super(`insuranceRatePercent must be a number between 0 and 100, got ${ratePercent}`);
  }
}

export class InvalidBookingModeException extends Error {
  constructor(mode: string) {
    super(`bookingMode must be 'instant-book' or 'request-to-book', got ${mode}`);
  }
}

export class InvalidOrderCommunicationModeException extends Error {
  constructor(mode: string) {
    super(`orderCommunicationMode must be 'FORMAL' or 'WHATSAPP', got ${mode}`);
  }
}

export class MissingWhatsAppNumberForWhatsAppModeException extends Error {
  constructor() {
    super('whatsAppNumber is required when orderCommunicationMode is WHATSAPP.');
    this.name = 'MissingWhatsAppNumberForWhatsAppModeException';
  }
}

export class InvalidWhatsAppNumberException extends Error {
  constructor(whatsAppNumber: string) {
    super(
      `whatsAppNumber must be a valid international WhatsApp number in canonical wa.me-compatible format, got ${whatsAppNumber}`,
    );
    this.name = 'InvalidWhatsAppNumberException';
  }
}
