import { useShallow } from "zustand/react/shallow";
import useCartStore from "./cart.store";
import type { CartActions, CartItem } from "./cart.types";

export const useCartItems = (): CartItem[] =>
	useCartStore(useShallow((state) => state.items));

export const useCartItemCount = (): number =>
	useCartStore((state) =>
		state.items.reduce((total, item) => total + item.quantity, 0),
	);

export const useCartIsEmpty = (): boolean =>
	useCartStore((state) => state.items.length === 0);

export const useCartActions = (): CartActions =>
	useCartStore((state) => state.actions);
