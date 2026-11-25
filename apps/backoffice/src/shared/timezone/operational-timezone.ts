export const DEFAULT_TENANT_TIMEZONE = "UTC";

type ResolveOperationalTimezoneInput = {
	branchTimezone?: string | null;
	tenantTimezone?: string | null;
};

export function resolveTenantTimezone(
	tenantTimezone: string | null | undefined,
): string {
	return tenantTimezone ?? DEFAULT_TENANT_TIMEZONE;
}

export function resolveOperationalTimezone({
	branchTimezone,
	tenantTimezone,
}: ResolveOperationalTimezoneInput): string {
	return branchTimezone ?? resolveTenantTimezone(tenantTimezone);
}
