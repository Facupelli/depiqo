import type {
	GetBranchDetailResponseDto,
	GetBranchesQueryDto,
	GetBranchesResponseDto,
	SearchBranchAddressSuggestionsResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { searchBranchAddressSuggestions } from "./address-suggestions.api";
import { getBranchDetail } from "./edit-branch/branch-detail.api";
import { getBranches } from "./list-branches/list-branches.api";

export type BranchesQueryOverrides<TData = GetBranchesResponseDto> = Omit<
	UseQueryOptions<GetBranchesResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type BranchDetailQueryOverrides<TData = GetBranchDetailResponseDto> =
	Omit<
		UseQueryOptions<GetBranchDetailResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

type AddressSuggestionsQueryOverrides<
	TData = SearchBranchAddressSuggestionsResponseDto,
> = Omit<
	UseQueryOptions<
		SearchBranchAddressSuggestionsResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const branchKeys = {
	all: () => ["v2", "tenant-management", "branches"] as const,
	lists: () => [...branchKeys.all(), "list"] as const,
	list: (query?: GetBranchesQueryDto) =>
		[...branchKeys.lists(), query ?? {}] as const,
	details: () => [...branchKeys.all(), "detail"] as const,
	detail: (branchId?: string) => [...branchKeys.details(), branchId] as const,
	addressSuggestions: (text: string) =>
		[...branchKeys.all(), "address-suggestions", text] as const,
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
	addressSuggestions: <TData = SearchBranchAddressSuggestionsResponseDto>(
		text: string,
		overrides?: AddressSuggestionsQueryOverrides<TData>,
	) =>
		queryOptions<
			SearchBranchAddressSuggestionsResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: branchKeys.addressSuggestions(text),
			queryFn: () => searchBranchAddressSuggestions(text),
			enabled: text.trim().length >= 3,
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

export function useBranchAddressSuggestions<
	TData = SearchBranchAddressSuggestionsResponseDto,
>(text: string, overrides?: AddressSuggestionsQueryOverrides<TData>) {
	return useQuery(branchQueries.addressSuggestions(text, overrides));
}
