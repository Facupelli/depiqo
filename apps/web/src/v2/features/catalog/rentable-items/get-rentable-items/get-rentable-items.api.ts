import {
	type GetRentableItemsQueryDto,
	GetRentableItemsQuerySchema,
	type GetRentableItemsResponseDto,
	GetRentableItemsResponseSchema,
	getRentableItemsContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

const GET_RENTABLE_ITEMS_QUERY_PARAM_KEYS = [
	"search",
	"kind",
	"status",
	"categoryId",
	"branchId",
	"isVisible",
	"isRentable",
	"hasActivePricing",
	"page",
	"pageSize",
] as const satisfies readonly (keyof GetRentableItemsQueryDto)[];

function buildGetRentableItemsPath(query?: GetRentableItemsQueryDto) {
	const parsedQuery = GetRentableItemsQuerySchema.parse(query ?? {});
	const searchParams = new URLSearchParams();

	for (const key of GET_RENTABLE_ITEMS_QUERY_PARAM_KEYS) {
		if (query?.[key] === undefined) {
			continue;
		}

		const value = parsedQuery[key];

		if (value !== undefined) {
			searchParams.set(key, String(value));
		}
	}

	return searchParams.size
		? `${getRentableItemsContract.path}?${searchParams.toString()}`
		: getRentableItemsContract.path;
}

export async function getRentableItems(
	query?: GetRentableItemsQueryDto,
): Promise<GetRentableItemsResponseDto> {
	const response = await apiFetch(buildGetRentableItemsPath(query), {
		method: getRentableItemsContract.method,
	});

	return GetRentableItemsResponseSchema.parse(response);
}
