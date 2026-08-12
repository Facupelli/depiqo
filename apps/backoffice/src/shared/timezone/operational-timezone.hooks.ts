import { useSuspenseQuery } from "@tanstack/react-query";
import { branchQueries } from "@/features/tenant-management/branch/branch.queries";
import { tenantQueries } from "@/features/tenant-management/tenant/tenant.queries";
import { useLocationId } from "@/shared/contexts/location/location.hooks";
import {
	resolveOperationalTimezone,
	resolveTenantTimezone,
} from "./operational-timezone";

/**
 * Resolves the timezone for tenant-level administrative timestamps.
 *
 * Dashboard routes preload the tenant query consumed here.
 */
export function useTenantTimezone(): string {
	const { data: tenant } = useSuspenseQuery(tenantQueries.current());

	return resolveTenantTimezone(tenant.config.timezone);
}

/**
 * Resolves the timezone for timestamps operationally owned by a branch.
 *
 * Dashboard routes preload the tenant and branch-list queries consumed here.
 */
export function useBranchTimezone(branchId: string | null | undefined): string {
	const { data: tenant } = useSuspenseQuery(tenantQueries.current());
	const { data: branches } = useSuspenseQuery(branchQueries.list());
	const branch = branches.find((candidate) => candidate.id === branchId);

	return resolveOperationalTimezone({
		branchTimezone: branch?.timezone,
		tenantTimezone: tenant.config.timezone,
	});
}

/** Resolves the operational timezone of the branch selected in the dashboard. */
export function useSelectedBranchTimezone(): string {
	return useBranchTimezone(useLocationId());
}
