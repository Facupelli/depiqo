import {
	type GetStorefrontCategoriesResponseDto,
	GetStorefrontCategoriesResponseSchema,
	getStorefrontCategoriesContract,
} from "@repo/api-contracts";
import { storefrontApiFetch } from "@/v2/lib/api/storefront-api-fetch";

export async function getStorefrontCategories(): Promise<GetStorefrontCategoriesResponseDto> {
	const response = await storefrontApiFetch({
		path: getStorefrontCategoriesContract.path as `/storefront/${string}`,
		method: getStorefrontCategoriesContract.method,
	});

	return GetStorefrontCategoriesResponseSchema.parse(response);
}
