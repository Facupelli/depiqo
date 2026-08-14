import type { GetCurrentTenantResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getCurrentTenant } from "./get-current-tenant/get-current-tenant.api";

export type CurrentTenantQueryOverrides<TData = GetCurrentTenantResponseDto> =
	Omit<
		UseQueryOptions<GetCurrentTenantResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

export const tenantKeys = {
	all: () => ["v2", "tenant-management", "tenant"] as const,
	current: () => [...tenantKeys.all(), "current"] as const,
};

export const tenantQueries = {
	current: <TData = GetCurrentTenantResponseDto>(
		overrides?: CurrentTenantQueryOverrides<TData>,
	) =>
		queryOptions<GetCurrentTenantResponseDto, ProblemDetailsError, TData>({
			queryKey: tenantKeys.current(),
			queryFn: getCurrentTenant,
			...overrides,
		}),
};

export function useCurrentTenant<TData = GetCurrentTenantResponseDto>(
	overrides?: CurrentTenantQueryOverrides<TData>,
) {
	return useQuery(tenantQueries.current(overrides));
}
