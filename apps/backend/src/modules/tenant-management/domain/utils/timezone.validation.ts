import { InvalidTimezoneError } from '../errors/tenant-management.errors';

export function assertValidIanaTimezone(timezone: string): void {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    throw new InvalidTimezoneError(timezone);
  }
}
