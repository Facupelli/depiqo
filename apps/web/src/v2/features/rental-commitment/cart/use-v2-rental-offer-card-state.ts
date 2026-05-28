import type { StorefrontRentalOfferListViewItemDto } from "@/v2/features/storefront/rental-offers/get-storefront-rental-offer-list-view/get-storefront-rental-offer-list-view.schema";
import {
	useV2RentalCartActions,
	useV2RentalCartItems,
} from "./v2-rental-cart.hooks";

export function useV2RentalOfferCardState({
	branchId,
	rentalOffer,
}: {
	branchId: string;
	rentalOffer: StorefrontRentalOfferListViewItemDto;
}) {
	const items = useV2RentalCartItems();
	const { addRentalOffer, incrementRentalOffer, decrementRentalOffer } =
		useV2RentalCartActions();

	const cartItem = items.find((item) => item.rentalOfferId === rentalOffer.id);

	const isInCart = cartItem !== undefined;
	const quantity = cartItem?.quantity ?? 0;
	const maxQuantity = rentalOffer.availableCount;
	const isUnavailable = maxQuantity === 0;
	const isAvailable = maxQuantity === null || maxQuantity > 0;
	const canIncrement = maxQuantity === null || quantity < maxQuantity;

	function handleAdd() {
		if (isUnavailable || rentalOffer.pricing === null) {
			return;
		}

		addRentalOffer(branchId, rentalOffer);
	}

	function handleIncrement() {
		incrementRentalOffer(rentalOffer.id);
	}

	function handleDecrement() {
		decrementRentalOffer(rentalOffer.id);
	}

	return {
		isAvailable,
		isUnavailable,
		isInCart,
		quantity,
		maxQuantity,
		canIncrement,
		handleAdd,
		handleIncrement,
		handleDecrement,
	};
}
