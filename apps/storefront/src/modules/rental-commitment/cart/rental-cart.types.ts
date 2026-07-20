import type { StorefrontRentalOfferListViewItemDto } from "@/modules/catalog/rental-offers/get-storefront-rental-offer-list-view/get-storefront-rental-offer-list-view.schema";

export type RentalCartItem = {
	rentalOfferId: string;
	name: string;
	quantity: number;
	image: string | null;
	description: string | null;
	pricing: StorefrontRentalOfferListViewItemDto["pricing"];
	availableCount: number | null;
};

export type RentalCartActions = {
	addRentalOffer: (
		branchId: string,
		offer: StorefrontRentalOfferListViewItemDto,
	) => void;
	incrementRentalOffer: (rentalOfferId: string) => void;
	decrementRentalOffer: (rentalOfferId: string) => void;
	changeRentalOfferQuantity: (rentalOfferId: string, quantity: number) => void;
	removeRentalOffer: (rentalOfferId: string) => void;
	clearCart: () => void;
	markHydrated: () => void;
};

export type RentalCartState = {
	branchId: string | null;
	items: RentalCartItem[];
	hasHydrated: boolean;
	actions: RentalCartActions;
};
