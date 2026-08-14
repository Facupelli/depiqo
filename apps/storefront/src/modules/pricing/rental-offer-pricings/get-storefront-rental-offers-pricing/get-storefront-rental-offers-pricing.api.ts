import {
	type GetStorefrontRentalOffersPricingQueryDto,
	GetStorefrontRentalOffersPricingQuerySchema,
	type GetStorefrontRentalOffersPricingResponseDto,
	GetStorefrontRentalOffersPricingResponseSchema,
	getStorefrontRentalOffersPricingContract,
} from "@repo/api-contracts";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import { storefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";

export async function getStorefrontRentalOffersPricing(
	requestContext: StorefrontRequestContext,
	query: GetStorefrontRentalOffersPricingQueryDto,
): Promise<GetStorefrontRentalOffersPricingResponseDto> {
	const parsedQuery = GetStorefrontRentalOffersPricingQuerySchema.parse(query);
	const response = await storefrontApiFetch(requestContext, {
		path: getStorefrontRentalOffersPricingContract.path as `/storefront/${string}`,
		method: getStorefrontRentalOffersPricingContract.method,
		query: parsedQuery,
	});

	return GetStorefrontRentalOffersPricingResponseSchema.parse(response);
}
