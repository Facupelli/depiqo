import { assertValidIanaTimezone } from './timezone.validation';

export function resolveEffectiveTimezone(
  branchTimezone: string | null | undefined,
  tenantTimezone: string | null | undefined,
): string {
  const timezone = branchTimezone?.trim() || tenantTimezone?.trim() || 'UTC';

  assertValidIanaTimezone(timezone);
  return timezone;
}
