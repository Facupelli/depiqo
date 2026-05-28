import type {
	GetBranchDetailResponseDto,
	GetBranchesQueryDto,
	GetBranchesResponseDto,
	GetStorefrontBranchScheduleSlotsQueryDto,
	GetStorefrontBranchScheduleSlotsResponseDto,
	GetStorefrontBranchSchedulesResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getBranchDetail } from "./get-branch-detail/get-branch-detail.api";
import { getBranches } from "./get-branches/get-branches.api";
import { getStorefrontBranchScheduleSlotsFn } from "./get-storefront-branch-schedule-slots/get-storefront-branch-schedule-slots.functions";
import { getStorefrontBranchSchedulesFn } from "./get-storefront-branch-schedules/get-storefront-branch-schedules.functions";

export type BranchesQueryOverrides<TData = GetBranchesResponseDto> = Omit<
	UseQueryOptions<GetBranchesResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type BranchDetailQueryOverrides<TData = GetBranchDetailResponseDto> =
	Omit<
		UseQueryOptions<GetBranchDetailResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

export type StorefrontBranchScheduleSlotsQueryOverrides<
	TData = GetStorefrontBranchScheduleSlotsResponseDto,
> = Omit<
	UseQueryOptions<
		GetStorefrontBranchScheduleSlotsResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export type StorefrontBranchSchedulesQueryOverrides<
	TData = GetStorefrontBranchSchedulesResponseDto,
> = Omit<
	UseQueryOptions<
		GetStorefrontBranchSchedulesResponseDto,
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
	storefrontScheduleSlots: (
		branchId?: string,
		query?: GetStorefrontBranchScheduleSlotsQueryDto,
	) =>
		[
			...branchKeys.all(),
			"storefront-schedule-slots",
			branchId,
			query,
		] as const,
	storefrontSchedules: (branchId?: string) =>
		[...branchKeys.all(), "storefront-schedules", branchId] as const,
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
	storefrontScheduleSlots: <
		TData = GetStorefrontBranchScheduleSlotsResponseDto,
	>(
		branchId?: string,
		query?: GetStorefrontBranchScheduleSlotsQueryDto,
		overrides?: StorefrontBranchScheduleSlotsQueryOverrides<TData>,
	) =>
		queryOptions<
			GetStorefrontBranchScheduleSlotsResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: branchKeys.storefrontScheduleSlots(branchId, query),
			queryFn: () => {
				if (!branchId) {
					throw new Error(
						"branchId is required to fetch storefront branch schedule slots.",
					);
				}

				if (!query) {
					throw new Error(
						"query is required to fetch storefront branch schedule slots.",
					);
				}

				return getStorefrontBranchScheduleSlotsFn({
					data: { params: { branchId }, query },
				});
			},
			enabled: !!branchId && !!query,
			...overrides,
		}),
	storefrontSchedules: <TData = GetStorefrontBranchSchedulesResponseDto>(
		branchId?: string,
		overrides?: StorefrontBranchSchedulesQueryOverrides<TData>,
	) =>
		queryOptions<
			GetStorefrontBranchSchedulesResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: branchKeys.storefrontSchedules(branchId),
			queryFn: () => {
				if (!branchId) {
					throw new Error(
						"branchId is required to fetch storefront branch schedules.",
					);
				}

				return getStorefrontBranchSchedulesFn({
					data: { params: { branchId } },
				});
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

export function useStorefrontBranchScheduleSlots<
	TData = GetStorefrontBranchScheduleSlotsResponseDto,
>(
	branchId?: string,
	query?: GetStorefrontBranchScheduleSlotsQueryDto,
	overrides?: StorefrontBranchScheduleSlotsQueryOverrides<TData>,
) {
	return useQuery(
		branchQueries.storefrontScheduleSlots(branchId, query, overrides),
	);
}

export function useStorefrontBranchSchedules<
	TData = GetStorefrontBranchSchedulesResponseDto,
>(
	branchId?: string,
	overrides?: StorefrontBranchSchedulesQueryOverrides<TData>,
) {
	return useQuery(branchQueries.storefrontSchedules(branchId, overrides));
}
