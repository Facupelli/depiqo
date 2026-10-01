import type { StorefrontRentalOfferListViewItemDto } from "@/modules/catalog/rental-offers/storefront-rental-offer-list-view.schema";
import { useRentalCartActions, useRentalCartItems } from "../rental-cart.hooks";

export function useRentalOfferCartState(
	branchId: string,
	offer: StorefrontRentalOfferListViewItemDto,
) {
	const item = useRentalCartItems().find(
		(candidate) => candidate.rentalOfferId === offer.id,
	);
	const { addRentalOffer, incrementRentalOffer, decrementRentalOffer } =
		useRentalCartActions();
	const quantity = item?.quantity ?? 0;
	const unavailable =
		!offer.isRentable || offer.availableCount === 0 || offer.pricing === null;
	return {
		quantity,
		isInCart: !!item,
		unavailable,
		canIncrement:
			!unavailable &&
			(offer.availableCount === null || quantity < offer.availableCount),
		add: () => {
			if (!unavailable) addRentalOffer(branchId, offer);
		},
		increment: () => {
			if (!unavailable) incrementRentalOffer(offer.id, offer.availableCount);
		},
		decrement: () => decrementRentalOffer(offer.id),
	};
}
