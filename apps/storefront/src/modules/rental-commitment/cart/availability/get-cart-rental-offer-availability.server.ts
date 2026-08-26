import { getStorefrontRentalOfferAvailability } from "@/modules/catalog/get-storefront-rental-offer-availability/get-storefront-rental-offer-availability.api";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import {
	type GetCartRentalOfferAvailabilityInput,
	GetCartRentalOfferAvailabilityInputSchema,
	type GetCartRentalOfferAvailabilityResponse,
} from "./get-cart-rental-offer-availability.schema";

export async function getCartRentalOfferAvailability(
	requestContext: StorefrontRequestContext,
	input: GetCartRentalOfferAvailabilityInput,
): Promise<GetCartRentalOfferAvailabilityResponse> {
	const parsedInput = GetCartRentalOfferAvailabilityInputSchema.parse(input);
	const availability = await getStorefrontRentalOfferAvailability(
		requestContext,
		{
			branchId: parsedInput.branchId,
			periodStart: parsedInput.periodStart,
			periodEnd: parsedInput.periodEnd,
			rentalOfferIds: parsedInput.rentalOfferIds,
		},
	);

	return availability;
}
