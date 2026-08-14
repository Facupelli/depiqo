import {
	keepPreviousData,
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import { getCsrfToken } from "@/features/tenant-management/auth/csrf-token";
import type { ProblemDetailsError } from "@/shared/errors";
import { searchDraftRentalOffersFn } from "./search-draft-rental-offers/search-draft-rental-offers.functions";
import type {
	SearchDraftRentalOffersInputDto,
	SearchDraftRentalOffersResponseDto,
} from "./search-draft-rental-offers/search-draft-rental-offers.schema";

export type DraftRentalOfferSearchQueryOverrides<
	TData = SearchDraftRentalOffersResponseDto,
> = Omit<
	UseQueryOptions<
		SearchDraftRentalOffersResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const draftRentalOfferKeys = {
	all: () =>
		["v2", "rental-commitment", "draft-rentals", "rental-offers"] as const,
	searches: () => [...draftRentalOfferKeys.all(), "search"] as const,
	search: (input: SearchDraftRentalOffersInputDto) =>
		[...draftRentalOfferKeys.searches(), input] as const,
};

export const draftRentalOfferQueries = {
	search: <TData = SearchDraftRentalOffersResponseDto>(
		input: SearchDraftRentalOffersInputDto,
		overrides?: DraftRentalOfferSearchQueryOverrides<TData>,
	) =>
		queryOptions<
			SearchDraftRentalOffersResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: draftRentalOfferKeys.search(input),
			queryFn: async () =>
				searchDraftRentalOffersFn({
					data: input,
					// TODO: fix-clean
					headers:
						typeof window !== "undefined"
							? { "x-csrf-token": await getCsrfToken() }
							: undefined,
				}),
			placeholderData: keepPreviousData,
			enabled: !!input.branchId,
			...overrides,
		}),
};

export function useDraftRentalOfferSearch<
	TData = SearchDraftRentalOffersResponseDto,
>(
	input: SearchDraftRentalOffersInputDto,
	overrides?: DraftRentalOfferSearchQueryOverrides<TData>,
) {
	return useQuery(draftRentalOfferQueries.search(input, overrides));
}
