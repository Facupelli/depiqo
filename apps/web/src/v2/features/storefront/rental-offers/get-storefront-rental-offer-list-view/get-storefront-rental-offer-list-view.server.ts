import type {
	GetStorefrontRentalOfferAvailabilityItemDto,
	GetStorefrontRentalOffersItemDto,
	GetStorefrontRentalOffersPricingItemDto,
	GetStorefrontRentalOffersResponseDto,
} from "@repo/api-contracts";
import { getStorefrontRentalOffers } from "@/v2/features/catalog/storefront-rental-offers/get-storefront-rental-offers/get-storefront-rental-offers.api";
import { getStorefrontRentalOffersPricing } from "@/v2/features/pricing/rental-offer-pricings/get-storefront-rental-offers-pricing/get-storefront-rental-offers-pricing.api";
import { getStorefrontRentalOfferAvailability } from "@/v2/features/rental-commitment/rental-offer-availability/get-storefront-rental-offer-availability/get-storefront-rental-offer-availability.api";
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
	input: GetStorefrontRentalOfferListViewInputDto,
): Promise<GetStorefrontRentalOfferListViewResponseDto> {
	const parsedInput = GetStorefrontRentalOfferListViewInputSchema.parse(input);

	const [packagesPage, singlesPage] = await Promise.all([
		getStorefrontRentalOffers({
			branchId: parsedInput.branchId,
			kind: "PACKAGE",
			page: 1,
			pageSize: 30,
		}),
		getStorefrontRentalOffers({
			branchId: parsedInput.branchId,
			kind: "SINGLE",
			categoryId: parsedInput.categoryId,
			search: parsedInput.search,
			page: parsedInput.page,
			pageSize: parsedInput.pageSize,
		}),
	]);

	const rentalOffers = [...packagesPage.data, ...singlesPage.data];
	const rentalOfferIds = rentalOffers.map((rentalOffer) => rentalOffer.id);

	const [rentalOfferPricing, rentalOfferAvailability] = await Promise.all([
		rentalOfferIds.length > 0
			? getStorefrontRentalOffersPricing({ rentalOfferIds })
			: Promise.resolve({ data: [] }),
		parsedInput.periodStart && parsedInput.periodEnd && rentalOffers.length > 0
			? getStorefrontRentalOfferAvailability({
					branchId: parsedInput.branchId,
					periodStart: new Date(parsedInput.periodStart),
					periodEnd: new Date(parsedInput.periodEnd),
					rentalOffers: rentalOffers.map((rentalOffer) => ({
						rentalOfferId: rentalOffer.id,
						requirements: rentalOffer.requirements,
					})),
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
