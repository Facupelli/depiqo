import {
	type GetRentableItemsQueryDto,
	GetRentableItemsQuerySchema,
	type GetRentableItemsResponseDto,
	GetRentableItemsResponseSchema,
	getRentableItemsContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

const GET_PRODUCTS_QUERY_PARAM_KEYS = [
	"search",
	"kinds",
	"archived",
	"categoryId",
	"branchId",
	"showInStore",
	"isRentable",
	"hasActivePricing",
	"page",
	"pageSize",
] as const satisfies readonly (keyof GetRentableItemsQueryDto)[];

function buildGetProductsPath(query?: GetRentableItemsQueryDto) {
	const parsedQuery = GetRentableItemsQuerySchema.parse(query ?? {});
	const searchParams = new URLSearchParams();

	for (const key of GET_PRODUCTS_QUERY_PARAM_KEYS) {
		if (query?.[key] === undefined) {
			continue;
		}

		const value = parsedQuery[key];

		if (value !== undefined) {
			searchParams.set(
				key,
				Array.isArray(value) ? value.join(",") : String(value),
			);
		}
	}

	const serializedSearchParams = searchParams.toString();
	return serializedSearchParams
		? `${getRentableItemsContract.path}?${serializedSearchParams}`
		: getRentableItemsContract.path;
}

export async function getProducts(
	query?: GetRentableItemsQueryDto,
): Promise<GetRentableItemsResponseDto> {
	const response = await apiFetch(buildGetProductsPath(query), {
		method: getRentableItemsContract.method,
	});

	return GetRentableItemsResponseSchema.parse(response);
}
