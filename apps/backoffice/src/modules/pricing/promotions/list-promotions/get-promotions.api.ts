import {
	type GetPromotionsQueryDto,
	GetPromotionsQuerySchema,
	type GetPromotionsResponseDto,
	GetPromotionsResponseSchema,
	getPromotionsContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getPromotions(
	query?: GetPromotionsQueryDto,
): Promise<GetPromotionsResponseDto> {
	const parsedQuery = GetPromotionsQuerySchema.parse(query ?? {});
	const searchParams = new URLSearchParams();

	if (parsedQuery.isActive !== undefined) {
		searchParams.set("isActive", String(parsedQuery.isActive));
	}

	if (parsedQuery.activation !== undefined) {
		searchParams.set("activation", parsedQuery.activation);
	}

	if (parsedQuery.effectType !== undefined) {
		searchParams.set("effectType", parsedQuery.effectType);
	}

	if (parsedQuery.search !== undefined) {
		searchParams.set("search", parsedQuery.search);
	}

	const path = searchParams.size
		? `${getPromotionsContract.path}?${searchParams.toString()}`
		: getPromotionsContract.path;

	const response = await apiFetch(path, {
		method: getPromotionsContract.method,
	});

	return GetPromotionsResponseSchema.parse(response);
}
