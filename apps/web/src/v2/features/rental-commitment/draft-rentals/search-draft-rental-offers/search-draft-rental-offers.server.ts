import type {
	GetRentalOfferAvailabilityItemDto,
	GetRentalOffersPricingItemDto,
	SearchRentalOffersItemDto,
} from "@repo/api-contracts";
import { searchRentalOffers } from "@/v2/features/catalog/rental-offers/search-rental-offers/search-rental-offers.api";
import { getRentalOffersPricing } from "@/v2/features/pricing/rental-offer-pricings/get-rental-offers-pricing/get-rental-offers-pricing.api";
import { getRentalOfferAvailability } from "@/v2/features/rental-commitment/rental-offer-availability/get-rental-offer-availability/get-rental-offer-availability.api";
import type {
	SearchDraftRentalOffersInputDto,
	SearchDraftRentalOffersResponseDto,
} from "./search-draft-rental-offers.schema";
import {
	SearchDraftRentalOffersInputSchema,
	SearchDraftRentalOffersResponseSchema,
} from "./search-draft-rental-offers.schema";

export async function searchDraftRentalOffers(
	input: SearchDraftRentalOffersInputDto,
): Promise<SearchDraftRentalOffersResponseDto> {
	const parsedInput = SearchDraftRentalOffersInputSchema.parse(input);

	const rentalOffersPage = await searchRentalOffers({
		branchId: parsedInput.branchId,
		search: parsedInput.search,
		page: parsedInput.page,
		pageSize: parsedInput.pageSize,
	});

	const rentalOfferIds = rentalOffersPage.data.map(
		(rentalOffer) => rentalOffer.id,
	);

	const [rentalOfferPricing, rentalOfferAvailability] = await Promise.all([
		rentalOfferIds.length > 0
			? getRentalOffersPricing({ rentalOfferIds })
			: Promise.resolve({ data: [] }),
		parsedInput.periodStart &&
		parsedInput.periodEnd &&
		rentalOffersPage.data.length > 0
			? getRentalOfferAvailability({
					branchId: parsedInput.branchId,
					periodStart: new Date(parsedInput.periodStart),
					periodEnd: new Date(parsedInput.periodEnd),
					rentalOffers: rentalOffersPage.data.map((rentalOffer) => ({
						rentalOfferId: rentalOffer.id,
						requirements: rentalOffer.requirements,
					})),
				})
			: Promise.resolve(null),
	]);

	const pricingByCatalogRentalOfferId = new Map<
		string,
		GetRentalOffersPricingItemDto
	>();

	for (const pricing of rentalOfferPricing.data) {
		if (pricingByCatalogRentalOfferId.has(pricing.catalogRentalOfferId)) {
			continue;
		}

		pricingByCatalogRentalOfferId.set(pricing.catalogRentalOfferId, pricing);
	}

	const availabilityByRentalOfferId = new Map<
		string,
		GetRentalOfferAvailabilityItemDto
	>();

	for (const availability of rentalOfferAvailability?.data ?? []) {
		availabilityByRentalOfferId.set(availability.rentalOfferId, availability);
	}

	return SearchDraftRentalOffersResponseSchema.parse({
		data: rentalOffersPage.data.map((rentalOffer) =>
			toDraftRentalOfferSearchItem(
				rentalOffer,
				pricingByCatalogRentalOfferId,
				availabilityByRentalOfferId,
			),
		),
		total: rentalOffersPage.total,
		page: rentalOffersPage.page,
		pageSize: rentalOffersPage.pageSize,
	});
}

function toDraftRentalOfferSearchItem(
	rentalOffer: SearchRentalOffersItemDto,
	pricingByCatalogRentalOfferId: Map<string, GetRentalOffersPricingItemDto>,
	availabilityByRentalOfferId: Map<string, GetRentalOfferAvailabilityItemDto>,
) {
	return {
		...rentalOffer,
		pricing: pricingByCatalogRentalOfferId.get(rentalOffer.id) ?? null,
		availableCount:
			availabilityByRentalOfferId.get(rentalOffer.id)?.availableCount ?? null,
	};
}
