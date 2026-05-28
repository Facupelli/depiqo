import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CartItemKey, CartState } from "./cart.types";

function matchesKey(item: CartItem, key: CartItemKey): boolean {
	if (key.type === "PRODUCT" && item.type === "PRODUCT") {
		return item.productTypeId === key.productTypeId;
	}
	if (key.type === "BUNDLE" && item.type === "BUNDLE") {
		return item.bundleId === key.bundleId;
	}
	return false;
}

const useCartStore = create<CartState>()(
	persist(
		(set) => ({
			items: [],

			actions: {
				addProduct: (product) =>
					set((state) => {
						const existing = state.items.find(
							(item) =>
								item.type === "PRODUCT" &&
								item.productTypeId === product.productTypeId,
						);

						if (existing) {
							return {
								items: state.items.map((item) =>
									item.type === "PRODUCT" &&
									item.productTypeId === product.productTypeId
										? { ...item, quantity: item.quantity + 1 }
										: item,
								),
							};
						}

						return {
							items: [
								...state.items,
								{ ...product, type: "PRODUCT" as const, quantity: 1 },
							],
						};
					}),

				addBundle: (bundle) =>
					set((state) => {
						const existing = state.items.find(
							(item) =>
								item.type === "BUNDLE" && item.bundleId === bundle.bundleId,
						);

						if (existing) {
							// return {
							//   items: state.items.map((item) =>
							//     item.type === "BUNDLE" && item.bundleId === bundle.bundleId
							//       ? { ...item, quantity: item.quantity + 1 }
							//       : item,
							//   ),
							// };
							return state;
						}

						return {
							items: [
								...state.items,
								{ ...bundle, type: "BUNDLE" as const, quantity: 1 },
							],
						};
					}),

				incrementQuantity: (key) =>
					set((state) => {
						if (key.type === "BUNDLE") {
							return state;
						}

						return {
							items: state.items.map((item) =>
								matchesKey(item, key)
									? { ...item, quantity: item.quantity + 1 }
									: item,
							),
						};
					}),

				decrementQuantity: (key) =>
					set((state) => {
						const item = state.items.find((i) => matchesKey(i, key));
						if (!item) return state;

						if (item.quantity === 1) {
							return { items: state.items.filter((i) => !matchesKey(i, key)) };
						}

						return {
							items: state.items.map((i) =>
								matchesKey(i, key) ? { ...i, quantity: i.quantity - 1 } : i,
							),
						};
					}),

				setQuantity: (key, value) =>
					set((state) => {
						if (key.type === "BUNDLE") return state;
						if (value < 0) return state;

						if (value === 0) {
							return {
								items: state.items.filter((i) => !matchesKey(i, key)),
							};
						}

						return {
							items: state.items.map((i) =>
								matchesKey(i, key) ? { ...i, quantity: value } : i,
							),
						};
					}),

				removeItem: (key) =>
					set((state) => ({
						items: state.items.filter((item) => !matchesKey(item, key)),
					})),

				clearCart: () => set({ items: [] }),
			},
		}),
		{
			name: "rental-cart",
			partialize: (state) => ({ items: state.items }),
		},
	),
);

export default useCartStore;
