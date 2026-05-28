import type { StorefrontRentalOfferListViewItemDto } from "@/v2/features/storefront/rental-offers/get-storefront-rental-offer-list-view/get-storefront-rental-offer-list-view.schema";
import { useCartActions, useCartItems } from "../cart.hooks";

export function useProductCardState(
	product: StorefrontRentalOfferListViewItemDto,
) {
	const items = useCartItems();
	const { addProduct, incrementQuantity, decrementQuantity } = useCartActions();

	const cartItem = items.find(
		(i) => i.type === "PRODUCT" && i.productTypeId === product.id,
	);

	const isInCart = cartItem !== undefined;
	const quantity = cartItem?.quantity ?? 0;
	const maxQuantity = product.availableCount;
	const isUnavailable = maxQuantity === 0;
	const isAvailable = maxQuantity === null || maxQuantity > 0;
	const canIncrement = maxQuantity === null || quantity < maxQuantity;

	function handleAdd() {
		if (isUnavailable) {
			return;
		}

		addProduct({
			productTypeId: product.id,
			name: product.name,
			pricePerUnit: Number(product.pricing.ratePlan.tiers[0].pricePerUnit),
			billingUnitLabel: product.pricing.ratePlan.billingUnit,
			assetCount: product.availableCount,
			imageUrl: product.image ?? null,
			// includedItems: product.includedItems ?? [],
			includedItems: [],
		});
	}

	function handleIncrement() {
		incrementQuantity({ type: "PRODUCT", productTypeId: product.id });
	}

	function handleDecrement() {
		decrementQuantity({ type: "PRODUCT", productTypeId: product.id });
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
