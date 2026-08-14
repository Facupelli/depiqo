import { DomainError } from 'src/core/exceptions/domain.error';

export class TenantManagementError extends DomainError {}

export class InvalidTenantNameError extends TenantManagementError {
  constructor() {
    super('Tenant name cannot be empty.');
  }
}

export class InvalidTenantSlugError extends TenantManagementError {
  constructor() {
    super('Tenant slug cannot be empty.');
  }
}

export class TenantSlugAlreadyInUseError extends TenantManagementError {
  constructor(slug: string) {
    super(`Tenant slug "${slug}" is already in use.`);
  }
}

export class InvalidCustomDomainError extends TenantManagementError {
  constructor(domain: string) {
    super(`Custom domain '${domain}' is invalid`);
  }
}

export class UnsupportedApexCustomDomainError extends TenantManagementError {
  constructor(domain: string) {
    super(`Custom domain '${domain}' must be a subdomain in Phase 1`);
  }
}

export class InvalidTimezoneError extends TenantManagementError {
  constructor(timezone: string) {
    super(`"${timezone}" is not a valid IANA timezone.`);
  }
}

export class InvalidNewArrivalsWindowDaysError extends TenantManagementError {
  constructor(days: number) {
    super(`newArrivalsWindowDays must be a positive integer, got ${days}.`);
  }
}

export class InvalidDefaultCurrencyError extends TenantManagementError {
  constructor(currency: string) {
    super(`"${currency}" is not a valid ISO 4217 currency code; expected 3 uppercase letters.`);
  }
}

export class InvalidMaxOverRentThresholdError extends TenantManagementError {
  constructor(threshold: number) {
    super(`maxOverRentThreshold must be a non-negative number, got ${threshold}.`);
  }
}

export class InvalidInsuranceRatePercentError extends TenantManagementError {
  constructor(ratePercent: number) {
    super(`insuranceRatePercent must be a number between 0 and 100, got ${ratePercent}.`);
  }
}

export class InvalidBookingModeError extends TenantManagementError {
  constructor(mode: string) {
    super(`bookingMode must be 'instant-book' or 'request-to-book', got ${mode}.`);
  }
}

export class InvalidOrderCommunicationModeError extends TenantManagementError {
  constructor(mode: string) {
    super(`orderCommunicationMode must be 'FORMAL' or 'WHATSAPP', got ${mode}.`);
  }
}

export class MissingWhatsAppNumberForWhatsAppModeError extends TenantManagementError {
  constructor() {
    super('whatsAppNumber is required when orderCommunicationMode is WHATSAPP.');
  }
}

export class InvalidWhatsAppNumberError extends TenantManagementError {
  constructor(whatsAppNumber: string) {
    super(
      `whatsAppNumber must be a valid international WhatsApp number in canonical wa.me-compatible format, got ${whatsAppNumber}.`,
    );
  }
}

export class InvalidBranchNameError extends TenantManagementError {
  constructor() {
    super('Branch name cannot be empty.');
  }
}

export class BranchNotFoundError extends TenantManagementError {
  constructor() {
    super('Branch was not found.');
  }
}

export class InvalidBranchScheduleTypeError extends TenantManagementError {
  constructor(type: string) {
    super(`Invalid branch schedule type: ${type}.`);
  }
}

export class InvalidBranchScheduleDaySpecificationError extends TenantManagementError {
  constructor() {
    super('Branch schedule must specify exactly one of dayOfWeek or specificDate.');
  }
}

export class InvalidBranchScheduleDayOfWeekError extends TenantManagementError {
  constructor(dayOfWeek: number) {
    super(`Branch schedule dayOfWeek must be an integer between 0 and 6, got ${dayOfWeek}.`);
  }
}

export class BranchScheduleOverlapError extends TenantManagementError {
  constructor() {
    super('Branch schedules cannot overlap for the same type and day/date.');
  }
}

export class InvalidBranchScheduleWindowError extends TenantManagementError {
  constructor(reason: string) {
    super(`Invalid branch schedule window: ${reason}`);
  }
}
