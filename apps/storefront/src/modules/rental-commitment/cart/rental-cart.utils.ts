import type { StorefrontRentalOfferListViewItemDto } from "@/modules/catalog/rental-offers/get-storefront-rental-offer-list-view/get-storefront-rental-offer-list-view.schema";
import type { RentalCartItem } from "./rental-cart.types";

export function toRentalCartItem(
	offer: StorefrontRentalOfferListViewItemDto,
): RentalCartItem {
	return {
		rentalOfferId: offer.id,
		name: offer.name,
		quantity: 1,
		image: offer.image,
		description: offer.description,
		packageComposition: offer.packageComposition,
		pricing: offer.pricing,
		availableCount: offer.availableCount,
	};
}

export function canIncreaseRentalCartItem(item: RentalCartItem): boolean {
	return item.availableCount === null || item.quantity < item.availableCount;
}
