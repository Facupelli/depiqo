import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { V2RentalCartState } from "./v2-rental-cart.types";
import {
	canIncreaseV2RentalCartItem,
	toV2RentalCartItem,
} from "./v2-rental-cart.utils";

const useV2RentalCartStoreBase = create<V2RentalCartState>()(
	persist(
		(set) => ({
			branchId: null,
			items: [],

			actions: {
				addRentalOffer: (branchId, offer) =>
					set((state) => {
						const nextItem = toV2RentalCartItem(offer);

						if (state.branchId !== null && state.branchId !== branchId) {
							return {
								branchId,
								items: [nextItem],
							};
						}

						const existing = state.items.find(
							(item) => item.rentalOfferId === offer.id,
						);

						if (existing) {
							if (!canIncreaseV2RentalCartItem(existing)) {
								return state;
							}

							return {
								branchId,
								items: state.items.map((item) =>
									item.rentalOfferId === offer.id
										? { ...item, quantity: item.quantity + 1 }
										: item,
								),
							};
						}

						return {
							branchId,
							items: [...state.items, nextItem],
						};
					}),

				incrementRentalOffer: (rentalOfferId) =>
					set((state) => ({
						items: state.items.map((item) =>
							item.rentalOfferId === rentalOfferId &&
							canIncreaseV2RentalCartItem(item)
								? { ...item, quantity: item.quantity + 1 }
								: item,
						),
					})),

				decrementRentalOffer: (rentalOfferId) =>
					set((state) => {
						const item = state.items.find(
							(cartItem) => cartItem.rentalOfferId === rentalOfferId,
						);

						if (!item) {
							return state;
						}

						const items =
							item.quantity === 1
								? state.items.filter(
										(cartItem) => cartItem.rentalOfferId !== rentalOfferId,
									)
								: state.items.map((cartItem) =>
										cartItem.rentalOfferId === rentalOfferId
											? { ...cartItem, quantity: cartItem.quantity - 1 }
											: cartItem,
									);

						return {
							branchId: items.length === 0 ? null : state.branchId,
							items,
						};
					}),

				changeRentalOfferQuantity: (rentalOfferId, quantity) =>
					set((state) => {
						if (quantity < 0) {
							return state;
						}

						const currentItem = state.items.find(
							(item) => item.rentalOfferId === rentalOfferId,
						);

						if (!currentItem) {
							return state;
						}

						const cappedQuantity =
							currentItem.availableCount === null
								? quantity
								: Math.min(quantity, currentItem.availableCount);

						const items =
							cappedQuantity === 0
								? state.items.filter(
										(item) => item.rentalOfferId !== rentalOfferId,
									)
								: state.items.map((item) =>
										item.rentalOfferId === rentalOfferId
											? { ...item, quantity: cappedQuantity }
											: item,
									);

						return {
							branchId: items.length === 0 ? null : state.branchId,
							items,
						};
					}),

				removeRentalOffer: (rentalOfferId) =>
					set((state) => {
						const items = state.items.filter(
							(item) => item.rentalOfferId !== rentalOfferId,
						);

						return {
							branchId: items.length === 0 ? null : state.branchId,
							items,
						};
					}),

				clearCart: () => set({ branchId: null, items: [] }),
			},
		}),
		{
			name: "v2-rental-cart",
			partialize: (state) => ({
				branchId: state.branchId,
				items: state.items,
			}),
		},
	),
);

export function useV2RentalCartStore<T>(
	selector: (state: V2RentalCartState) => T,
): T {
	return useV2RentalCartStoreBase(selector);
}
