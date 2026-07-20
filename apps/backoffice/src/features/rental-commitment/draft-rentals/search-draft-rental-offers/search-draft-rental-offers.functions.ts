import { createServerFn } from "@tanstack/react-start";
import { SearchDraftRentalOffersInputSchema } from "./search-draft-rental-offers.schema";
import { searchDraftRentalOffers } from "./search-draft-rental-offers.server";

export const searchDraftRentalOffersFn = createServerFn({
	method: "GET",
})
	.validator((data) => SearchDraftRentalOffersInputSchema.parse(data))
	.handler(async ({ data }) => searchDraftRentalOffers(data));
