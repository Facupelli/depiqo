export const DEFAULT_TENANT_TIMEZONE = "UTC";
export const DEFAULT_OPERATIONAL_TIMEZONE = DEFAULT_TENANT_TIMEZONE;

type ResolveOperationalTimezoneInput = {
	branchTimezone?: string | null;
	tenantTimezone?: string | null;
};

/** Resolves the timezone for tenant-level administrative timestamps. */
export function resolveTenantTimezone(
	tenantTimezone: string | null | undefined,
): string {
	return tenantTimezone ?? DEFAULT_TENANT_TIMEZONE;
}

/**
 * Resolves the timezone for branch-operational timestamps.
 *
 * This does not apply to date-only values or tenant-level timestamps.
 */
export function resolveOperationalTimezone({
	branchTimezone,
	tenantTimezone,
}: ResolveOperationalTimezoneInput): string {
	return branchTimezone ?? resolveTenantTimezone(tenantTimezone);
}
