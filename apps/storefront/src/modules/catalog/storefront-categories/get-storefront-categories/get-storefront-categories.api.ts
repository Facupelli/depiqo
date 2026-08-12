import {
	type GetStorefrontCategoriesResponseDto,
	GetStorefrontCategoriesResponseSchema,
	getStorefrontCategoriesContract,
} from "@repo/api-contracts";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import { storefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";

export async function getStorefrontCategories(
	requestContext: StorefrontRequestContext,
): Promise<GetStorefrontCategoriesResponseDto> {
	const response = await storefrontApiFetch(requestContext, {
		path: getStorefrontCategoriesContract.path as `/storefront/${string}`,
		method: getStorefrontCategoriesContract.method,
	});

	return GetStorefrontCategoriesResponseSchema.parse(response);
}
