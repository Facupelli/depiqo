import type {
	GetStorefrontRentalOffersQueryDto,
	GetStorefrontRentalOffersResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getStorefrontRentalOffers } from "./get-storefront-rental-offers/get-storefront-rental-offers.api";

export type StorefrontRentalOffersQueryOverrides<
	TData = GetStorefrontRentalOffersResponseDto,
> = Omit<
	UseQueryOptions<
		GetStorefrontRentalOffersResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const storefrontRentalOfferKeys = {
	all: () => ["storefront", "catalog", "rental-offers"] as const,
	lists: () => [...storefrontRentalOfferKeys.all(), "list"] as const,
	list: (query: GetStorefrontRentalOffersQueryDto) =>
		[...storefrontRentalOfferKeys.lists(), query] as const,
};

export const storefrontRentalOfferQueries = {
	list: <TData = GetStorefrontRentalOffersResponseDto>(
		query: GetStorefrontRentalOffersQueryDto,
		overrides?: StorefrontRentalOffersQueryOverrides<TData>,
	) =>
		queryOptions<
			GetStorefrontRentalOffersResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: storefrontRentalOfferKeys.list(query),
			queryFn: () => getStorefrontRentalOffers(query),
			...overrides,
		}),
};

export function useStorefrontRentalOffers<
	TData = GetStorefrontRentalOffersResponseDto,
>(
	query: GetStorefrontRentalOffersQueryDto,
	overrides?: StorefrontRentalOffersQueryOverrides<TData>,
) {
	return useQuery(storefrontRentalOfferQueries.list(query, overrides));
}
