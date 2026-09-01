import { composeStorefrontRentalOfferListViewPage } from "@/modules/catalog/rental-offers/compose-storefront-rental-offer-list-view-page.server";
import type { StorefrontRentalOfferListViewPageDto } from "@/modules/catalog/rental-offers/storefront-rental-offer-list-view.schema";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import {
	type GetStorefrontCombosInputDto,
	GetStorefrontCombosInputSchema,
} from "./get-storefront-combos.schema";

export async function getStorefrontCombos(
	requestContext: StorefrontRequestContext,
	input: GetStorefrontCombosInputDto,
): Promise<StorefrontRentalOfferListViewPageDto> {
	const parsedInput = GetStorefrontCombosInputSchema.parse(input);

	return composeStorefrontRentalOfferListViewPage(
		requestContext,
		{
			branchId: parsedInput.branchId,
			kind: "PACKAGE",
			page: 1,
			pageSize: 100,
		},
		{
			pickupDate: parsedInput.periodStart,
			returnDate: parsedInput.periodEnd,
			pickupInstant: parsedInput.pickupInstant,
			returnInstant: parsedInput.returnInstant,
		},
	);
}
