import { createServerFn } from "@tanstack/react-start";
import { GetStorefrontRentalOfferListViewInputSchema } from "./get-storefront-rental-offer-list-view.schema";
import { getStorefrontRentalOfferListView } from "./get-storefront-rental-offer-list-view.server";

export const getStorefrontRentalOfferListViewFn = createServerFn({
	method: "GET",
})
	.validator((data) =>
		GetStorefrontRentalOfferListViewInputSchema.parse(data),
	)
	.handler(async ({ data }) => getStorefrontRentalOfferListView(data));
