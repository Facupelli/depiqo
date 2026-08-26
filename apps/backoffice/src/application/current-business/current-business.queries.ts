import type { GetCurrentTenantResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getCurrentBusiness } from "./get-current-business.api";

export type CurrentBusinessQueryOverrides<TData = GetCurrentTenantResponseDto> =
	Omit<
		UseQueryOptions<GetCurrentTenantResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

export const currentBusinessKeys = {
	all: () => ["v2", "tenant-management", "tenant"] as const,
	current: () => [...currentBusinessKeys.all(), "current"] as const,
};

export const currentBusinessQueries = {
	current: <TData = GetCurrentTenantResponseDto>(
		overrides?: CurrentBusinessQueryOverrides<TData>,
	) =>
		queryOptions<GetCurrentTenantResponseDto, ProblemDetailsError, TData>({
			queryKey: currentBusinessKeys.current(),
			queryFn: getCurrentBusiness,
			...overrides,
		}),
};

export function useCurrentBusiness<TData = GetCurrentTenantResponseDto>(
	overrides?: CurrentBusinessQueryOverrides<TData>,
) {
	return useQuery(currentBusinessQueries.current(overrides));
}
