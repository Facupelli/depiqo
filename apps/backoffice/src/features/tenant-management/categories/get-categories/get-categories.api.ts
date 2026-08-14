import {
	type GetCategoriesResponseDto,
	GetCategoriesResponseSchema,
	getCategoriesContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getCategories(): Promise<GetCategoriesResponseDto> {
	const response = await apiFetch(getCategoriesContract.path, {
		method: getCategoriesContract.method,
	});

	return GetCategoriesResponseSchema.parse(response);
}
