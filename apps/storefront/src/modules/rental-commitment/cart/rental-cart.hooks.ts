import { useShallow } from "zustand/react/shallow";
import { useRentalCartStore } from "./rental-cart.store";
import type { RentalCartActions, RentalCartItem } from "./rental-cart.types";

export const useRentalCartBranchId = () =>
	useRentalCartStore((state) => state.branchId);
export const useRentalCartHydrated = () =>
	useRentalCartStore((state) => state.hasHydrated);
export const useRentalCartItems = (): RentalCartItem[] =>
	useRentalCartStore(useShallow((state) => state.items));
export const useRentalCartItemCount = () =>
	useRentalCartStore((state) =>
		state.items.reduce((total, item) => total + item.quantity, 0),
	);
export const useRentalCartActions = (): RentalCartActions =>
	useRentalCartStore((state) => state.actions);
