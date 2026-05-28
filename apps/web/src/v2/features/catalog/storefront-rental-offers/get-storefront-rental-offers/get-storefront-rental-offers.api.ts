import {
	type GetStorefrontRentalOffersQueryDto,
	GetStorefrontRentalOffersQuerySchema,
	type GetStorefrontRentalOffersResponseDto,
	GetStorefrontRentalOffersResponseSchema,
	getStorefrontRentalOffersContract,
} from "@repo/api-contracts";
import { storefrontApiFetch } from "@/v2/lib/api/storefront-api-fetch";

const GET_STOREFRONT_RENTAL_OFFERS_QUERY_PARAM_KEYS = [
	"branchId",
	"page",
	"pageSize",
	"kind",
	"categoryId",
	"search",
] as const satisfies readonly (keyof GetStorefrontRentalOffersQueryDto)[];

function buildGetStorefrontRentalOffersQuery(
	query: GetStorefrontRentalOffersQueryDto,
) {
	const parsedQuery = GetStorefrontRentalOffersQuerySchema.parse(query);
	const searchQuery: Record<string, string | number | boolean> = {};

	for (const key of GET_STOREFRONT_RENTAL_OFFERS_QUERY_PARAM_KEYS) {
		if (query[key] === undefined) {
			continue;
		}

		const value = parsedQuery[key];

		if (value !== undefined) {
			searchQuery[key] = value;
		}
	}

	return searchQuery;
}

export async function getStorefrontRentalOffers(
	query: GetStorefrontRentalOffersQueryDto,
): Promise<GetStorefrontRentalOffersResponseDto> {
	const response = await storefrontApiFetch({
		path: getStorefrontRentalOffersContract.path as `/storefront/${string}`,
		method: getStorefrontRentalOffersContract.method,
		query: buildGetStorefrontRentalOffersQuery(query),
	});

	return GetStorefrontRentalOffersResponseSchema.parse(response);
}
