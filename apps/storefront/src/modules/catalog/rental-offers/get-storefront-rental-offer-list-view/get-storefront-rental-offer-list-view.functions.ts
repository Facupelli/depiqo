import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { GetStorefrontRentalOfferListViewInputSchema } from "./get-storefront-rental-offer-list-view.schema";
import { getStorefrontRentalOfferListView } from "./get-storefront-rental-offer-list-view.server";

export const getStorefrontRentalOfferListViewFn = createServerFn({
	method: "GET",
})
	.middleware([storefrontFunctionRequestContextMiddleware])
	.validator((data) => GetStorefrontRentalOfferListViewInputSchema.parse(data))
	.handler(async ({ data, context }) =>
		getStorefrontRentalOfferListView(context.storefrontRequest, data),
	);
