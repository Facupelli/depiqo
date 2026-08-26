import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RentalCartState } from "./rental-cart.types";
import {
	canIncreaseRentalCartItem,
	toRentalCartItem,
} from "./rental-cart.utils";

const useRentalCartStoreBase = create<RentalCartState>()(
	persist(
		(set) => ({
			branchId: null,
			items: [],
			hasHydrated: false,
			actions: {
				addRentalOffer: (branchId, offer) =>
					set((state) => {
						const nextItem = toRentalCartItem(offer);
						if (state.branchId !== null && state.branchId !== branchId)
							return { branchId, items: [nextItem] };
						const existing = state.items.find(
							(item) => item.rentalOfferId === offer.id,
						);
						if (!existing)
							return { branchId, items: [...state.items, nextItem] };
						if (!canIncreaseRentalCartItem(existing)) return state;
						return {
							branchId,
							items: state.items.map((item) =>
								item.rentalOfferId === offer.id
									? { ...item, quantity: item.quantity + 1 }
									: item,
							),
						};
					}),
				incrementRentalOffer: (id) =>
					set((state) => ({
						items: state.items.map((item) =>
							item.rentalOfferId === id && canIncreaseRentalCartItem(item)
								? { ...item, quantity: item.quantity + 1 }
								: item,
						),
					})),
				decrementRentalOffer: (id) =>
					set((state) => {
						const current = state.items.find(
							(item) => item.rentalOfferId === id,
						);
						if (!current) return state;
						const items =
							current.quantity === 1
								? state.items.filter((item) => item.rentalOfferId !== id)
								: state.items.map((item) =>
										item.rentalOfferId === id
											? { ...item, quantity: item.quantity - 1 }
											: item,
									);
						return { branchId: items.length ? state.branchId : null, items };
					}),
				changeRentalOfferQuantity: (id, quantity) =>
					set((state) => {
						if (quantity < 0) return state;
						const current = state.items.find(
							(item) => item.rentalOfferId === id,
						);
						if (!current) return state;
						const nextQuantity =
							current.availableCount === null
								? quantity
								: Math.min(quantity, current.availableCount);
						const items =
							nextQuantity === 0
								? state.items.filter((item) => item.rentalOfferId !== id)
								: state.items.map((item) =>
										item.rentalOfferId === id
											? { ...item, quantity: nextQuantity }
											: item,
									);
						return { branchId: items.length ? state.branchId : null, items };
					}),
				removeRentalOffer: (id) =>
					set((state) => {
						const items = state.items.filter(
							(item) => item.rentalOfferId !== id,
						);
						return { branchId: items.length ? state.branchId : null, items };
					}),
				clearCart: () => set({ branchId: null, items: [] }),
				markHydrated: () => set({ hasHydrated: true }),
			},
		}),
		{
			name: "rental-cart",
			partialize: ({ branchId, items }) => ({ branchId, items }),
			onRehydrateStorage: () => (state) => {
				state?.actions.markHydrated();
			},
		},
	),
);

export function useRentalCartStore<T>(
	selector: (state: RentalCartState) => T,
): T {
	return useRentalCartStoreBase(selector);
}
