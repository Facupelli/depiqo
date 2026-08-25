import type {
	SearchRentalOffersQueryDto,
	SearchRentalOffersResponseDto,
} from "@repo/api-contracts";
import {
	keepPreviousData,
	queryOptions,
	type UseQueryOptions,
} from "@tanstack/react-query";
import { searchRentalOffers } from "@/modules/rentals/shared/rental-offers/search-rental-offers.api";
import type { ProblemDetailsError } from "@/shared/errors";

export type RentalOfferSearchInputDto = Pick<
	SearchRentalOffersQueryDto,
	"branchId" | "search" | "page"
>;

export type RentalOfferSearchQueryOverrides<
	TData = SearchRentalOffersResponseDto,
> = Omit<
	UseQueryOptions<SearchRentalOffersResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const rentalOfferSearchKeys = {
	all: () => ["v2", "rentals", "rental-offer-search"] as const,
	searches: () => [...rentalOfferSearchKeys.all(), "search"] as const,
	search: (input: RentalOfferSearchInputDto) =>
		[...rentalOfferSearchKeys.searches(), input] as const,
};

const RENTAL_OFFER_SEARCH_PAGE_SIZE = 10;

export const rentalOfferSearchQueries = {
	pageSize: RENTAL_OFFER_SEARCH_PAGE_SIZE,
	search: <TData = SearchRentalOffersResponseDto>(
		input: RentalOfferSearchInputDto,
		overrides?: RentalOfferSearchQueryOverrides<TData>,
	) =>
		queryOptions({
			queryKey: rentalOfferSearchKeys.search(input),
			queryFn: () =>
				searchRentalOffers({
					branchId: input.branchId,
					search: input.search,
					page: input.page,
					pageSize: RENTAL_OFFER_SEARCH_PAGE_SIZE,
				}),
			placeholderData: keepPreviousData,
			enabled: input.branchId.length > 0,
			...overrides,
		}),
};
