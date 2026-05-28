import type { StorefrontRentalOfferListViewItemDto } from "@/v2/features/storefront/rental-offers/get-storefront-rental-offer-list-view/get-storefront-rental-offer-list-view.schema";
import type {
	V2RentalCartItem,
	V2RentalCartSelection,
} from "./v2-rental-cart.types";

export function toV2RentalCartItem(
	offer: StorefrontRentalOfferListViewItemDto,
): V2RentalCartItem {
	return {
		rentalOfferId: offer.id,
		name: offer.name,
		quantity: 1,
		image: offer.image,
		description: offer.description,
		pricing: offer.pricing,
		availableCount: offer.availableCount,
	};
}

export function toV2RentalCartSelections(
	items: V2RentalCartItem[],
): V2RentalCartSelection[] {
	return items.map((item) => ({
		rentalOfferId: item.rentalOfferId,
		quantity: item.quantity,
	}));
}

export function canIncreaseV2RentalCartItem(item: V2RentalCartItem): boolean {
	return item.availableCount === null || item.quantity < item.availableCount;
}
