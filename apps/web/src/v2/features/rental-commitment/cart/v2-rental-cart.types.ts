import type { StorefrontRentalOfferListViewItemDto } from "@/v2/features/storefront/rental-offers/get-storefront-rental-offer-list-view/get-storefront-rental-offer-list-view.schema";

export type V2RentalCartPricingSnapshot =
	StorefrontRentalOfferListViewItemDto["pricing"];

export type V2RentalCartItem = {
	rentalOfferId: string;
	name: string;
	quantity: number;
	image: string | null;
	description: string | null;
	pricing: V2RentalCartPricingSnapshot;
	availableCount: number | null;
};

export type V2RentalCartSelection = {
	rentalOfferId: string;
	quantity: number;
};

export type V2RentalCartActions = {
	addRentalOffer: (
		branchId: string,
		offer: StorefrontRentalOfferListViewItemDto,
	) => void;
	incrementRentalOffer: (rentalOfferId: string) => void;
	decrementRentalOffer: (rentalOfferId: string) => void;
	changeRentalOfferQuantity: (rentalOfferId: string, quantity: number) => void;
	removeRentalOffer: (rentalOfferId: string) => void;
	clearCart: () => void;
};

export type V2RentalCartState = {
	branchId: string | null;
	items: V2RentalCartItem[];
	actions: V2RentalCartActions;
};
