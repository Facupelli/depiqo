export const DEFAULT_OPERATIONAL_TIMEZONE = "UTC";

type ResolveOperationalTimezoneInput = {
	branchTimezone?: string | null;
	tenantTimezone?: string | null;
};

/**
 * Resolves the timezone for branch-operational timestamps.
 *
 * This does not apply to date-only values or tenant-level timestamps.
 */
export function resolveOperationalTimezone({
	branchTimezone,
	tenantTimezone,
}: ResolveOperationalTimezoneInput): string {
	return branchTimezone ?? tenantTimezone ?? DEFAULT_OPERATIONAL_TIMEZONE;
}
