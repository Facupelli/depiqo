import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import { getCsrfToken } from "@/lib/api/csrf-token";
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

export function getDraftRentalOfferSearchInputFromQueryKey(
	queryKey: readonly unknown[],
): SearchDraftRentalOffersInputDto | undefined {
	const prefix = draftRentalOfferKeys.searches();

	if (queryKey.length !== prefix.length + 1) return undefined;
	if (!prefix.every((segment, index) => queryKey[index] === segment)) {
		return undefined;
	}

	const input = queryKey[prefix.length];
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		return undefined;
	}

	return input as SearchDraftRentalOffersInputDto;
}

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
