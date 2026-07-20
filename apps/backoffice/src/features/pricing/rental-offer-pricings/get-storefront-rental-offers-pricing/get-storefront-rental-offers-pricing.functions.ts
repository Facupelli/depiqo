import { GetStorefrontRentalOffersPricingQuerySchema } from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { getStorefrontRentalOffersPricing } from "./get-storefront-rental-offers-pricing.api";

export const getStorefrontRentalOffersPricingFn = createServerFn({
	method: "GET",
})
	.inputValidator((data) =>
		GetStorefrontRentalOffersPricingQuerySchema.parse(data),
	)
	.handler(async ({ data }) => getStorefrontRentalOffersPricing(data));
