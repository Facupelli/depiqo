import type {
	GetBranchDetailResponseDto,
	GetBranchesQueryDto,
	GetBranchesResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getBranchDetail } from "./get-branch-detail/get-branch-detail.api";
import { getBranches } from "./get-branches/get-branches.api";

export type BranchesQueryOverrides<TData = GetBranchesResponseDto> = Omit<
	UseQueryOptions<GetBranchesResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type BranchDetailQueryOverrides<TData = GetBranchDetailResponseDto> =
	Omit<
		UseQueryOptions<GetBranchDetailResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

export const branchKeys = {
	all: () => ["v2", "tenant-management", "branches"] as const,
	lists: () => [...branchKeys.all(), "list"] as const,
	list: (query?: GetBranchesQueryDto) =>
		[...branchKeys.lists(), query ?? {}] as const,
	details: () => [...branchKeys.all(), "detail"] as const,
	detail: (branchId?: string) => [...branchKeys.details(), branchId] as const,
};

export const branchQueries = {
	list: <TData = GetBranchesResponseDto>(
		query?: GetBranchesQueryDto,
		overrides?: BranchesQueryOverrides<TData>,
	) =>
		queryOptions<GetBranchesResponseDto, ProblemDetailsError, TData>({
			queryKey: branchKeys.list(query),
			queryFn: () => getBranches(query),
			...overrides,
		}),
	detail: <TData = GetBranchDetailResponseDto>(
		branchId?: string,
		overrides?: BranchDetailQueryOverrides<TData>,
	) =>
		queryOptions<GetBranchDetailResponseDto, ProblemDetailsError, TData>({
			queryKey: branchKeys.detail(branchId),
			queryFn: () => {
				if (!branchId) {
					throw new Error("branchId is required to fetch branch detail.");
				}

				return getBranchDetail(branchId);
			},
			enabled: !!branchId,
			...overrides,
		}),
};

export function useBranches<TData = GetBranchesResponseDto>(
	query?: GetBranchesQueryDto,
	overrides?: BranchesQueryOverrides<TData>,
) {
	return useQuery(branchQueries.list(query, overrides));
}

export function useBranchDetail<TData = GetBranchDetailResponseDto>(
	branchId?: string,
	overrides?: BranchDetailQueryOverrides<TData>,
) {
	return useQuery(branchQueries.detail(branchId, overrides));
}
