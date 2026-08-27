import type { StorefrontRentalOfferListViewItemDto } from "@/modules/catalog/rental-offers/storefront-rental-offer-list-view.schema";
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

export function canIncreaseRentalCartItem(
	item: RentalCartItem,
	availableCount: number | null | undefined = item.availableCount,
): boolean {
	return availableCount === null || item.quantity < availableCount;
}
