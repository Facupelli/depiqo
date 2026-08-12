import { GetStorefrontRentalOffersPricingQuerySchema } from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { getStorefrontRentalOffersPricing } from "./get-storefront-rental-offers-pricing.api";

export const getStorefrontRentalOffersPricingFn = createServerFn({
	method: "GET",
})
	.middleware([storefrontFunctionRequestContextMiddleware])
	.inputValidator((data) =>
		GetStorefrontRentalOffersPricingQuerySchema.parse(data),
	)
	.handler(async ({ data, context }) =>
		getStorefrontRentalOffersPricing(context.storefrontRequest, data),
	);
