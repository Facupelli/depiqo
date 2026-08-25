import type { SearchRentalOffersItemDto } from "@repo/api-contracts";

export type AddProductOfferAvailability =
	| "checking"
	| "available"
	| "unavailable"
	| "error";

export interface AddProductOfferOption {
	offer: SearchRentalOffersItemDto;
	imageUrl: string | null;
	isAdded: boolean;
	isSelected: boolean;
	availability: AddProductOfferAvailability;
	availableCount: number | null;
}

export function isOfferSelectable(option: {
	isAdded: boolean;
	availability: AddProductOfferAvailability;
}): boolean {
	return !option.isAdded && option.availability === "available";
}

export function clampQuantity(
	quantity: number,
	maxQuantity: number | null,
): number {
	const minQuantity = 1;
	if (maxQuantity === null) {
		return Math.max(quantity, minQuantity);
	}
	return Math.min(Math.max(quantity, minQuantity), maxQuantity);
}

export function isSelectedOfferSubmittable(
	selectedOffer: AddProductOfferOption | null,
	quantity: number,
): boolean {
	if (!selectedOffer) {
		return false;
	}
	if (!isOfferSelectable(selectedOffer)) {
		return false;
	}
	const { availableCount } = selectedOffer;
	if (availableCount === null || availableCount <= 0) {
		return false;
	}
	return (
		Number.isInteger(quantity) && quantity >= 1 && quantity <= availableCount
	);
}
