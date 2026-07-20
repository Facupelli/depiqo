import {
	type GetStorefrontRentalOfferAvailabilityRequestDto,
	GetStorefrontRentalOfferAvailabilityRequestSchema,
	type GetStorefrontRentalOfferAvailabilityResponseDto,
	GetStorefrontRentalOfferAvailabilityResponseSchema,
	getStorefrontRentalOfferAvailabilityContract,
} from "@repo/api-contracts";
import { storefrontApiFetch } from "@/lib/api/storefront-api-fetch";

export async function getStorefrontRentalOfferAvailability(
	body: GetStorefrontRentalOfferAvailabilityRequestDto,
): Promise<GetStorefrontRentalOfferAvailabilityResponseDto> {
	const parsedBody =
		GetStorefrontRentalOfferAvailabilityRequestSchema.parse(body);
	const response = await storefrontApiFetch({
		path: getStorefrontRentalOfferAvailabilityContract.path as `/storefront/${string}`,
		method: getStorefrontRentalOfferAvailabilityContract.method,
		body: parsedBody,
	});

	return GetStorefrontRentalOfferAvailabilityResponseSchema.parse(response);
}
