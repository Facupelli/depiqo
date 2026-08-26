import type {
	GetStorefrontRentalOfferAvailabilityItemDto,
	GetStorefrontRentalOffersItemDto,
	GetStorefrontRentalOffersPricingItemDto,
	GetStorefrontRentalOffersResponseDto,
} from "@repo/api-contracts";
import { getStorefrontRentalOfferAvailability } from "@/modules/catalog/get-storefront-rental-offer-availability/get-storefront-rental-offer-availability.api";
import { getStorefrontRentalOffers } from "@/modules/catalog/rental-offers/get-storefront-rental-offers/get-storefront-rental-offers.api";
import { getStorefrontRentalOffersPricing } from "@/modules/pricing/rental-offer-pricings/get-storefront-rental-offers-pricing/get-storefront-rental-offers-pricing.api";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import type {
	GetStorefrontRentalOfferListViewInputDto,
	GetStorefrontRentalOfferListViewResponseDto,
	StorefrontRentalOfferListViewPageDto,
} from "./get-storefront-rental-offer-list-view.schema";
import {
	GetStorefrontRentalOfferListViewInputSchema,
	GetStorefrontRentalOfferListViewResponseSchema,
} from "./get-storefront-rental-offer-list-view.schema";

export async function getStorefrontRentalOfferListView(
	requestContext: StorefrontRequestContext,
	input: GetStorefrontRentalOfferListViewInputDto,
): Promise<GetStorefrontRentalOfferListViewResponseDto> {
	const parsedInput = GetStorefrontRentalOfferListViewInputSchema.parse(input);

	const emptyPage: GetStorefrontRentalOffersResponseDto = {
		data: [],
		total: 0,
		page: 1,
		pageSize: parsedInput.pageSize,
	};
	const [packagesPage, singlesPage] = await Promise.all([
		parsedInput.kind === "SINGLE"
			? Promise.resolve(emptyPage)
			: getStorefrontRentalOffers(requestContext, {
					branchId: parsedInput.branchId,
					kind: "PACKAGE",
					page: 1,
					pageSize: 100,
				}),
		getStorefrontRentalOffers(requestContext, {
			branchId: parsedInput.branchId,
			kind: "SINGLE",
			categoryId: parsedInput.categoryId,
			search: parsedInput.search,
			publishedAfter: parsedInput.publishedAfter,
			sort: parsedInput.sort,
			page: parsedInput.page,
			pageSize: parsedInput.pageSize,
		}),
	]);

	const rentalOffers = [...packagesPage.data, ...singlesPage.data];
	const rentalOfferIds = rentalOffers.map((rentalOffer) => rentalOffer.id);

	const [rentalOfferPricing, rentalOfferAvailability] = await Promise.all([
		rentalOfferIds.length > 0
			? getStorefrontRentalOffersPricing(requestContext, { rentalOfferIds })
			: Promise.resolve({ data: [] }),
		parsedInput.periodStart && parsedInput.periodEnd && rentalOffers.length > 0
			? getStorefrontRentalOfferAvailability(requestContext, {
					branchId: parsedInput.branchId,
					periodStart: parsedInput.periodStart,
					periodEnd: parsedInput.periodEnd,
					rentalOfferIds,
				})
			: Promise.resolve(null),
	]);

	const pricingByCatalogRentalOfferId = new Map<
		string,
		GetStorefrontRentalOffersPricingItemDto
	>();

	for (const pricing of rentalOfferPricing.data) {
		if (pricingByCatalogRentalOfferId.has(pricing.catalogRentalOfferId)) {
			continue;
		}

		pricingByCatalogRentalOfferId.set(pricing.catalogRentalOfferId, pricing);
	}

	const availabilityByRentalOfferId = new Map<
		string,
		GetStorefrontRentalOfferAvailabilityItemDto
	>();

	for (const availability of rentalOfferAvailability?.data ?? []) {
		availabilityByRentalOfferId.set(availability.rentalOfferId, availability);
	}

	return GetStorefrontRentalOfferListViewResponseSchema.parse({
		packages: toRentalOfferListViewPage(
			packagesPage,
			pricingByCatalogRentalOfferId,
			availabilityByRentalOfferId,
		),
		singles: toRentalOfferListViewPage(
			singlesPage,
			pricingByCatalogRentalOfferId,
			availabilityByRentalOfferId,
		),
	});
}

function toRentalOfferListViewPage(
	rentalOffersPage: GetStorefrontRentalOffersResponseDto,
	pricingByCatalogRentalOfferId: Map<
		string,
		GetStorefrontRentalOffersPricingItemDto
	>,
	availabilityByRentalOfferId: Map<
		string,
		GetStorefrontRentalOfferAvailabilityItemDto
	>,
): StorefrontRentalOfferListViewPageDto {
	return {
		data: rentalOffersPage.data.map((rentalOffer) =>
			toRentalOfferListViewItem(
				rentalOffer,
				pricingByCatalogRentalOfferId,
				availabilityByRentalOfferId,
			),
		),
		total: rentalOffersPage.total,
		page: rentalOffersPage.page,
		pageSize: rentalOffersPage.pageSize,
	};
}

function toRentalOfferListViewItem(
	rentalOffer: GetStorefrontRentalOffersItemDto,
	pricingByCatalogRentalOfferId: Map<
		string,
		GetStorefrontRentalOffersPricingItemDto
	>,
	availabilityByRentalOfferId: Map<
		string,
		GetStorefrontRentalOfferAvailabilityItemDto
	>,
) {
	return {
		...rentalOffer,
		pricing: pricingByCatalogRentalOfferId.get(rentalOffer.id) ?? null,
		availableCount:
			availabilityByRentalOfferId.get(rentalOffer.id)?.availableCount ?? null,
	};
}
