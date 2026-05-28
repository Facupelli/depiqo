import {
	type SearchRentalOffersQueryDto,
	SearchRentalOffersQuerySchema,
	type SearchRentalOffersResponseDto,
	SearchRentalOffersResponseSchema,
	searchRentalOffersContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

const SEARCH_RENTAL_OFFERS_QUERY_PARAM_KEYS = [
	"branchId",
	"search",
	"page",
	"pageSize",
] as const satisfies readonly (keyof SearchRentalOffersQueryDto)[];

function buildSearchRentalOffersPath(query: SearchRentalOffersQueryDto) {
	const parsedQuery = SearchRentalOffersQuerySchema.parse(query);
	const searchParams = new URLSearchParams();

	for (const key of SEARCH_RENTAL_OFFERS_QUERY_PARAM_KEYS) {
		if (query[key] === undefined) {
			continue;
		}

		const value = parsedQuery[key];

		if (value !== undefined) {
			searchParams.set(key, String(value));
		}
	}

	return searchParams.size
		? `${searchRentalOffersContract.path}?${searchParams.toString()}`
		: searchRentalOffersContract.path;
}

export async function searchRentalOffers(
	query: SearchRentalOffersQueryDto,
): Promise<SearchRentalOffersResponseDto> {
	const response = await apiFetch(buildSearchRentalOffersPath(query), {
		method: searchRentalOffersContract.method,
	});

	return SearchRentalOffersResponseSchema.parse(response);
}
