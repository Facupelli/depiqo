import {
	type SearchStorefrontDeliveryAddressSuggestionsQueryDto,
	SearchStorefrontDeliveryAddressSuggestionsQuerySchema,
	type SearchStorefrontDeliveryAddressSuggestionsResponseDto,
	SearchStorefrontDeliveryAddressSuggestionsResponseSchema,
	searchStorefrontDeliveryAddressSuggestionsContract,
} from "@repo/api-contracts";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import { storefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";

export async function searchDeliveryAddressSuggestions(
	requestContext: StorefrontRequestContext,
	query: SearchStorefrontDeliveryAddressSuggestionsQueryDto,
): Promise<SearchStorefrontDeliveryAddressSuggestionsResponseDto> {
	const parsedQuery =
		SearchStorefrontDeliveryAddressSuggestionsQuerySchema.parse(query);
	const response = await storefrontApiFetch(requestContext, {
		path: searchStorefrontDeliveryAddressSuggestionsContract.path,
		method: searchStorefrontDeliveryAddressSuggestionsContract.method,
		query: parsedQuery,
	});

	return SearchStorefrontDeliveryAddressSuggestionsResponseSchema.parse(
		response,
	);
}
