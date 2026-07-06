import type {
	GetRentableItemDetailResponseDto,
	GetRentableItemsQueryDto,
	GetRentableItemsResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getRentableItemDetail } from "./get-rentable-item-detail/get-rentable-item-detail.api";
import { getRentableItems } from "./get-rentable-items/get-rentable-items.api";

export type RentableItemsQueryOverrides<TData = GetRentableItemsResponseDto> =
	Omit<
		UseQueryOptions<GetRentableItemsResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

export type RentableItemDetailQueryOverrides<
	TData = GetRentableItemDetailResponseDto,
> = Omit<
	UseQueryOptions<GetRentableItemDetailResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const rentableItemKeys = {
	all: () => ["v2", "catalog", "rentable-items"] as const,
	lists: () => [...rentableItemKeys.all(), "list"] as const,
	list: (query?: GetRentableItemsQueryDto) =>
		[...rentableItemKeys.lists(), query ?? {}] as const,
	details: () => [...rentableItemKeys.all(), "detail"] as const,
	detail: (rentableItemId?: string) =>
		[...rentableItemKeys.details(), rentableItemId] as const,
};

export const rentableItemQueries = {
	list: <TData = GetRentableItemsResponseDto>(
		query?: GetRentableItemsQueryDto,
		overrides?: RentableItemsQueryOverrides<TData>,
	) =>
		queryOptions<GetRentableItemsResponseDto, ProblemDetailsError, TData>({
			queryKey: rentableItemKeys.list(query),
			queryFn: () => getRentableItems(query),
			...overrides,
		}),
	detail: <TData = GetRentableItemDetailResponseDto>(
		rentableItemId?: string,
		overrides?: RentableItemDetailQueryOverrides<TData>,
	) =>
		queryOptions<GetRentableItemDetailResponseDto, ProblemDetailsError, TData>({
			queryKey: rentableItemKeys.detail(rentableItemId),
			queryFn: () => {
				if (!rentableItemId) {
					throw new Error(
						"rentableItemId is required to fetch rentable item detail.",
					);
				}

				return getRentableItemDetail(rentableItemId);
			},
			enabled: !!rentableItemId,
			...overrides,
		}),
};

export function useRentableItems<TData = GetRentableItemsResponseDto>(
	query?: GetRentableItemsQueryDto,
	overrides?: RentableItemsQueryOverrides<TData>,
) {
	return useQuery(rentableItemQueries.list(query, overrides));
}

export function useRentableItemDetail<TData = GetRentableItemDetailResponseDto>(
	rentableItemId?: string,
	overrides?: RentableItemDetailQueryOverrides<TData>,
) {
	return useQuery(rentableItemQueries.detail(rentableItemId, overrides));
}
