import type { GetStorefrontBranchesResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getStorefrontBranchesFn } from "./get-storefront-branches/get-storefront-branches.functions";

export type StorefrontBranchesQueryOverrides<
	TData = GetStorefrontBranchesResponseDto,
> = Omit<
	UseQueryOptions<GetStorefrontBranchesResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const storefrontBranchKeys = {
	all: () => ["storefront", "rental-commitment", "branches"] as const,
	lists: () => [...storefrontBranchKeys.all(), "list"] as const,
	list: () => storefrontBranchKeys.lists(),
};

export const storefrontBranchQueries = {
	list: <TData = GetStorefrontBranchesResponseDto>(
		overrides?: StorefrontBranchesQueryOverrides<TData>,
	) =>
		queryOptions<GetStorefrontBranchesResponseDto, ProblemDetailsError, TData>({
			queryKey: storefrontBranchKeys.list(),
			queryFn: () => getStorefrontBranchesFn(),
			...overrides,
		}),
};

export function useStorefrontBranches<TData = GetStorefrontBranchesResponseDto>(
	overrides?: StorefrontBranchesQueryOverrides<TData>,
) {
	return useQuery(storefrontBranchQueries.list(overrides));
}
