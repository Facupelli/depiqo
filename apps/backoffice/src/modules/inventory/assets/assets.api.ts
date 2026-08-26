import type {
	GetAssetsQueryDto,
	GetAssetsResponseDto,
} from "@repo/api-contracts";
import {
	GetAssetsQuerySchema,
	GetAssetsResponseSchema,
	getAssetsContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getAssets(
	filters?: GetAssetsQueryDto,
): Promise<GetAssetsResponseDto> {
	const parsedFilters = GetAssetsQuerySchema.parse(filters ?? {});
	const searchParams = new URLSearchParams();

	if (parsedFilters.ownerId !== undefined) {
		searchParams.set("ownerId", parsedFilters.ownerId);
	}

	const path = searchParams.size
		? `${getAssetsContract.path}?${searchParams.toString()}`
		: getAssetsContract.path;

	const response = await apiFetch(path, {
		method: getAssetsContract.method,
	});

	return GetAssetsResponseSchema.parse(response);
}
