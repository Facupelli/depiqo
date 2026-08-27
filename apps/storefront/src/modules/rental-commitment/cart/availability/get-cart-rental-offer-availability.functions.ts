import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { GetCartRentalOfferAvailabilityInputSchema } from "./get-cart-rental-offer-availability.schema";
import { getCartRentalOfferAvailability } from "./get-cart-rental-offer-availability.server";

export const getCartRentalOfferAvailabilityFn = createServerFn({
	method: "POST",
})
	.middleware([storefrontFunctionRequestContextMiddleware])
	.inputValidator((data) =>
		GetCartRentalOfferAvailabilityInputSchema.parse(data),
	)
	.handler(async ({ data, context }) =>
		getCartRentalOfferAvailability(context.storefrontRequest, data),
	);
