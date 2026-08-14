import {
	keepPreviousData,
	queryOptions,
	type UseQueryOptions,
	useSuspenseQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getStorefrontRentalOfferListViewFn } from "./rental-offers/get-storefront-rental-offer-list-view/get-storefront-rental-offer-list-view.functions";
import type {
	GetStorefrontRentalOfferListViewInputDto,
	GetStorefrontRentalOfferListViewResponseDto,
} from "./rental-offers/get-storefront-rental-offer-list-view/get-storefront-rental-offer-list-view.schema";

export type StorefrontRentalOfferListViewQueryOverrides<
	TData = GetStorefrontRentalOfferListViewResponseDto,
> = Omit<
	UseQueryOptions<
		GetStorefrontRentalOfferListViewResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const storefrontRentalOfferListViewKeys = {
	all: () => ["v2", "storefront", "rental-offer-list-view"] as const,
	lists: () => [...storefrontRentalOfferListViewKeys.all(), "list"] as const,
	list: (input: GetStorefrontRentalOfferListViewInputDto) =>
		[...storefrontRentalOfferListViewKeys.lists(), input] as const,
};

export const storefrontRentalOfferListViewQueries = {
	list: <TData = GetStorefrontRentalOfferListViewResponseDto>(
		input: GetStorefrontRentalOfferListViewInputDto,
		overrides?: StorefrontRentalOfferListViewQueryOverrides<TData>,
	) =>
		queryOptions<
			GetStorefrontRentalOfferListViewResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: storefrontRentalOfferListViewKeys.list(input),
			queryFn: () => getStorefrontRentalOfferListViewFn({ data: input }),
			placeholderData: keepPreviousData,
			...overrides,
		}),
};

export function useStorefrontRentalOfferListView<
	TData = GetStorefrontRentalOfferListViewResponseDto,
>(
	input: GetStorefrontRentalOfferListViewInputDto,
	overrides?: StorefrontRentalOfferListViewQueryOverrides<TData>,
) {
	return useSuspenseQuery(
		storefrontRentalOfferListViewQueries.list(input, overrides),
	);
}
