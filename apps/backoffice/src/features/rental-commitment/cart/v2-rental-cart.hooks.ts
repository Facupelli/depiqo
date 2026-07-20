import { useShallow } from "zustand/react/shallow";
import { useV2RentalCartStore } from "./v2-rental-cart.store";
import type {
	V2RentalCartActions,
	V2RentalCartItem,
	V2RentalCartSelection,
} from "./v2-rental-cart.types";
import { toV2RentalCartSelections } from "./v2-rental-cart.utils";

export const useV2RentalCartBranchId = (): string | null =>
	useV2RentalCartStore((state) => state.branchId);

export const useV2RentalCartItems = (): V2RentalCartItem[] =>
	useV2RentalCartStore(useShallow((state) => state.items));

export const useV2RentalCartItemCount = (): number =>
	useV2RentalCartStore((state) =>
		state.items.reduce((total, item) => total + item.quantity, 0),
	);

export const useV2RentalCartIsEmpty = (): boolean =>
	useV2RentalCartStore((state) => state.items.length === 0);

export const useV2RentalCartSelections = (): V2RentalCartSelection[] =>
	useV2RentalCartStore(
		useShallow((state) => toV2RentalCartSelections(state.items)),
	);

export const useV2RentalCartActions = (): V2RentalCartActions =>
	useV2RentalCartStore((state) => state.actions);
