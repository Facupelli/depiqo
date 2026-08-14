import type {
	GetStorefrontBranchScheduleSlotsQueryDto,
	GetStorefrontBranchScheduleSlotsResponseDto,
	GetStorefrontBranchSchedulesResponseDto,
} from "@repo/api-contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getStorefrontBranchScheduleSlotsFn } from "./get-storefront-branch-schedule-slots/get-storefront-branch-schedule-slots.functions";
import { getStorefrontBranchSchedulesFn } from "./get-storefront-branch-schedules/get-storefront-branch-schedules.functions";

export const storefrontBranchScheduleKeys = {
	all: () => ["storefront", "branch-schedules"] as const,
	schedules: (branchId?: string) =>
		[...storefrontBranchScheduleKeys.all(), "schedules", branchId] as const,
	slots: (
		branchId?: string,
		query?: GetStorefrontBranchScheduleSlotsQueryDto,
	) =>
		[...storefrontBranchScheduleKeys.all(), "slots", branchId, query] as const,
};

export const storefrontBranchScheduleQueries = {
	schedules: (branchId?: string) =>
		queryOptions<GetStorefrontBranchSchedulesResponseDto>({
			queryKey: storefrontBranchScheduleKeys.schedules(branchId),
			queryFn: () => {
				if (!branchId) throw new Error("branchId is required");
				return getStorefrontBranchSchedulesFn({
					data: { params: { branchId } },
				});
			},
			enabled: !!branchId,
		}),
	slots: (
		branchId?: string,
		query?: GetStorefrontBranchScheduleSlotsQueryDto,
	) =>
		queryOptions<GetStorefrontBranchScheduleSlotsResponseDto>({
			queryKey: storefrontBranchScheduleKeys.slots(branchId, query),
			queryFn: () => {
				if (!branchId || !query)
					throw new Error("branchId and query are required");
				return getStorefrontBranchScheduleSlotsFn({
					data: { params: { branchId }, query },
				});
			},
			enabled: !!branchId && !!query,
		}),
};

export function useStorefrontBranchSchedules(branchId?: string) {
	return useQuery(storefrontBranchScheduleQueries.schedules(branchId));
}

export function useStorefrontBranchScheduleSlots(
	branchId?: string,
	query?: GetStorefrontBranchScheduleSlotsQueryDto,
) {
	return useQuery(storefrontBranchScheduleQueries.slots(branchId, query));
}
