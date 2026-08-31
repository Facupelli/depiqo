import type {
	GetStorefrontRentalOfferAvailabilityItemDto,
	GetStorefrontRentalOffersItemDto,
	GetStorefrontRentalOffersPricingItemDto,
	GetStorefrontRentalOffersQueryDto,
	GetStorefrontRentalOffersResponseDto,
} from "@repo/api-contracts";
import { getStorefrontRentalOfferAvailability } from "@/modules/catalog/get-storefront-rental-offer-availability/get-storefront-rental-offer-availability.api";
import { getStorefrontRentalOffers } from "@/modules/catalog/rental-offers/get-storefront-rental-offers/get-storefront-rental-offers.api";
import {
	type StorefrontRentalOfferListViewPageDto,
	StorefrontRentalOfferListViewPageSchema,
} from "@/modules/catalog/rental-offers/storefront-rental-offer-list-view.schema";
import { getStorefrontRentalOffersPricing } from "@/modules/pricing/rental-offer-pricings/get-storefront-rental-offers-pricing/get-storefront-rental-offers-pricing.api";
import { getStorefrontBranchScheduleSlots } from "@/modules/tenant-management/branches/get-storefront-branch-schedule-slots/get-storefront-branch-schedule-slots.api";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";

interface RentalOfferAvailabilityPeriod {
	pickupDate?: string;
	returnDate?: string;
	pickupInstant?: string;
	returnInstant?: string;
}

export async function composeStorefrontRentalOfferListViewPage(
	requestContext: StorefrontRequestContext,
	offersQuery: GetStorefrontRentalOffersQueryDto,
	availabilityPeriod?: RentalOfferAvailabilityPeriod,
): Promise<StorefrontRentalOfferListViewPageDto> {
	const rentalOffersPage = await getStorefrontRentalOffers(
		requestContext,
		offersQuery,
	);
	const rentalOfferIds = rentalOffersPage.data.map(
		(rentalOffer) => rentalOffer.id,
	);

	const pickupDate = availabilityPeriod?.pickupDate;
	const returnDate = availabilityPeriod?.returnDate;
	const pickupInstant = availabilityPeriod?.pickupInstant;
	const returnInstant = availabilityPeriod?.returnInstant;
	const hasCandidatePeriod =
		pickupDate !== undefined &&
		returnDate !== undefined &&
		pickupInstant !== undefined &&
		returnInstant !== undefined &&
		Date.parse(returnInstant) > Date.parse(pickupInstant);

	const [rentalOfferPricing, scheduleSlots] = await Promise.all([
		rentalOfferIds.length > 0
			? getStorefrontRentalOffersPricing(requestContext, { rentalOfferIds })
			: Promise.resolve({ data: [] }),
		hasCandidatePeriod
			? getStorefrontBranchScheduleSlots(requestContext, offersQuery.branchId, {
					periodStart: pickupDate,
					periodEnd: returnDate,
				})
			: Promise.resolve(null),
	]);
	const exactAvailabilityPeriod =
		hasCandidatePeriod &&
		scheduleSlots?.pickupSlots?.some((slot) => slot.instant === pickupInstant) &&
		scheduleSlots.returnSlots?.some((slot) => slot.instant === returnInstant)
			? { periodStart: pickupInstant, periodEnd: returnInstant }
			: null;
	const rentalOfferAvailability =
		exactAvailabilityPeriod && rentalOfferIds.length > 0
			? await getStorefrontRentalOfferAvailability(requestContext, {
					branchId: offersQuery.branchId,
					periodStart: exactAvailabilityPeriod.periodStart,
					periodEnd: exactAvailabilityPeriod.periodEnd,
					rentalOfferIds,
				})
			: null;

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

	return StorefrontRentalOfferListViewPageSchema.parse(
		toRentalOfferListViewPage(
			rentalOffersPage,
			pricingByCatalogRentalOfferId,
			availabilityByRentalOfferId,
		),
	);
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
