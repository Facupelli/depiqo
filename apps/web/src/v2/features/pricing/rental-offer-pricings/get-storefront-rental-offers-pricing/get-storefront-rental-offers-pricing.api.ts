import {
	type GetStorefrontRentalOffersPricingQueryDto,
	GetStorefrontRentalOffersPricingQuerySchema,
	type GetStorefrontRentalOffersPricingResponseDto,
	GetStorefrontRentalOffersPricingResponseSchema,
	getStorefrontRentalOffersPricingContract,
} from "@repo/api-contracts";
import { storefrontApiFetch } from "@/v2/lib/api/storefront-api-fetch";

export async function getStorefrontRentalOffersPricing(
	query: GetStorefrontRentalOffersPricingQueryDto,
): Promise<GetStorefrontRentalOffersPricingResponseDto> {
	const parsedQuery = GetStorefrontRentalOffersPricingQuerySchema.parse(query);
	const response = await storefrontApiFetch({
		path: getStorefrontRentalOffersPricingContract.path as `/storefront/${string}`,
		method: getStorefrontRentalOffersPricingContract.method,
		query: parsedQuery,
	});

	return GetStorefrontRentalOffersPricingResponseSchema.parse(response);
}
