import { composeStorefrontRentalOfferListViewPage } from "@/modules/catalog/rental-offers/compose-storefront-rental-offer-list-view-page.server";
import type { StorefrontRentalOfferListViewPageDto } from "@/modules/catalog/rental-offers/storefront-rental-offer-list-view.schema";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import {
	type GetStorefrontEquipmentInputDto,
	GetStorefrontEquipmentInputSchema,
} from "./get-storefront-equipment.schema";

export async function getStorefrontEquipment(
	requestContext: StorefrontRequestContext,
	input: GetStorefrontEquipmentInputDto,
): Promise<StorefrontRentalOfferListViewPageDto> {
	const parsedInput = GetStorefrontEquipmentInputSchema.parse(input);

	return composeStorefrontRentalOfferListViewPage(
		requestContext,
		{
			branchId: parsedInput.branchId,
			kind: "SINGLE",
			categoryId: parsedInput.categoryId,
			search: parsedInput.search,
			page: parsedInput.page,
			pageSize: parsedInput.pageSize,
		},
		{
			periodStart: parsedInput.periodStart,
			periodEnd: parsedInput.periodEnd,
		},
	);
}
