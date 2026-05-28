import type {
	GetStorefrontRentalOffersPricingQueryDto,
	GetStorefrontRentalOffersPricingResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getStorefrontRentalOffersPricingFn } from "./get-storefront-rental-offers-pricing/get-storefront-rental-offers-pricing.functions";

export type StorefrontRentalOffersPricingQueryOverrides<
	TData = GetStorefrontRentalOffersPricingResponseDto,
> = Omit<
	UseQueryOptions<
		GetStorefrontRentalOffersPricingResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const rentalOfferPricingKeys = {
	all: () => ["v2", "pricing", "rental-offer-pricings"] as const,
	storefront: () => [...rentalOfferPricingKeys.all(), "storefront"] as const,
	storefrontLists: () =>
		[...rentalOfferPricingKeys.storefront(), "list"] as const,
	storefrontList: (query: GetStorefrontRentalOffersPricingQueryDto) =>
		[...rentalOfferPricingKeys.storefrontLists(), query] as const,
};

export const rentalOfferPricingQueries = {
	storefrontList: <TData = GetStorefrontRentalOffersPricingResponseDto>(
		query: GetStorefrontRentalOffersPricingQueryDto,
		overrides?: StorefrontRentalOffersPricingQueryOverrides<TData>,
	) =>
		queryOptions<
			GetStorefrontRentalOffersPricingResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: rentalOfferPricingKeys.storefrontList(query),
			queryFn: () => getStorefrontRentalOffersPricingFn({ data: query }),
			...overrides,
		}),
};

export function useStorefrontRentalOffersPricing<
	TData = GetStorefrontRentalOffersPricingResponseDto,
>(
	query: GetStorefrontRentalOffersPricingQueryDto,
	overrides?: StorefrontRentalOffersPricingQueryOverrides<TData>,
) {
	return useQuery(rentalOfferPricingQueries.storefrontList(query, overrides));
}
