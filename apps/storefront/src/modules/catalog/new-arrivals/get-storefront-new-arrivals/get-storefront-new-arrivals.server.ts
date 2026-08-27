import { composeStorefrontRentalOfferListViewPage } from "@/modules/catalog/rental-offers/compose-storefront-rental-offer-list-view-page.server";
import type { StorefrontRentalOfferListViewItemDto } from "@/modules/catalog/rental-offers/storefront-rental-offer-list-view.schema";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import {
	type GetStorefrontNewArrivalsInputDto,
	GetStorefrontNewArrivalsInputSchema,
} from "./get-storefront-new-arrivals.schema";

const NEW_ARRIVALS_PAGE_SIZE = 12;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

export async function getStorefrontNewArrivals(
	requestContext: StorefrontRequestContext,
	input: GetStorefrontNewArrivalsInputDto,
): Promise<StorefrontRentalOfferListViewItemDto[]> {
	const parsedInput = GetStorefrontNewArrivalsInputSchema.parse(input);
	const publishedAfter = new Date(
		Date.now() - parsedInput.windowDays * MILLISECONDS_PER_DAY,
	).toISOString();
	const page = await composeStorefrontRentalOfferListViewPage(requestContext, {
		branchId: parsedInput.branchId,
		kind: "SINGLE",
		publishedAfter,
		sort: "PUBLISHED_AT_DESC",
		page: 1,
		pageSize: NEW_ARRIVALS_PAGE_SIZE,
	});

	return page.data;
}
