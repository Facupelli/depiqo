import type {
	GetRentalOfferAvailabilityItemDto,
	GetRentalOffersPricingItemDto,
	SearchRentalOffersItemDto,
} from "@repo/api-contracts";
import { getRentalOfferAvailability } from "./get-rental-offer-availability.api";
import { getRentalOffersPricing } from "./get-rental-offers-pricing.api";
import type {
	SearchDraftRentalOffersInputDto,
	SearchDraftRentalOffersResponseDto,
} from "./search-draft-rental-offers.schema";
import {
	SearchDraftRentalOffersInputSchema,
	SearchDraftRentalOffersResponseSchema,
} from "./search-draft-rental-offers.schema";
import { searchRentalOffers } from "./search-rental-offers.api";

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
					periodStart: parsedInput.periodStart,
					periodEnd: parsedInput.periodEnd,
					rentalOfferIds,
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

	for (const availability of rentalOfferAvailability ?? []) {
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
