import { useSuspenseQuery } from "@tanstack/react-query";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import { branchQueries } from "@/modules/settings/branches/public";
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
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());

	return resolveTenantTimezone(business.config.timezone);
}

/**
 * Resolves the timezone for timestamps operationally owned by a branch.
 *
 * Dashboard routes preload the tenant and branch-list queries consumed here.
 */
export function useBranchTimezone(branchId: string | null | undefined): string {
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	const { data: branches } = useSuspenseQuery(branchQueries.list());
	const branch = branches.find((candidate) => candidate.id === branchId);

	return resolveOperationalTimezone({
		branchTimezone: branch?.timezone,
		tenantTimezone: business.config.timezone,
	});
}
