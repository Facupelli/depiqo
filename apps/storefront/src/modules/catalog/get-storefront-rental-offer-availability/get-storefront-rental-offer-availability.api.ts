import {
	type GetStorefrontRentalOfferAvailabilityRequestDto,
	GetStorefrontRentalOfferAvailabilityRequestSchema,
	type GetStorefrontRentalOfferAvailabilityResponseDto,
	GetStorefrontRentalOfferAvailabilityResponseSchema,
	getStorefrontRentalOfferAvailabilityContract,
} from "@repo/api-contracts";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import { storefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";

export async function getStorefrontRentalOfferAvailability(
	requestContext: StorefrontRequestContext,
	body: GetStorefrontRentalOfferAvailabilityRequestDto,
): Promise<GetStorefrontRentalOfferAvailabilityResponseDto> {
	const parsedBody =
		GetStorefrontRentalOfferAvailabilityRequestSchema.parse(body);
	const response = await storefrontApiFetch(requestContext, {
		path: getStorefrontRentalOfferAvailabilityContract.path as `/storefront/${string}`,
		method: getStorefrontRentalOfferAvailabilityContract.method,
		body: parsedBody,
	});

	return GetStorefrontRentalOfferAvailabilityResponseSchema.parse(response);
}
