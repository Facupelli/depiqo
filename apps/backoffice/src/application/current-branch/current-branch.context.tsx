import type { GetBranchesResponseDto } from "@repo/api-contracts";
import type React from "react";
import { createContext, useContext, useState } from "react";
import { createStore, type StoreApi, useStore } from "zustand";
import {
	CURRENT_BRANCH_STORAGE_KEY,
	type CurrentBranchStore,
} from "./current-branch.types";

const CurrentBranchStoreContext =
	createContext<StoreApi<CurrentBranchStore> | null>(null);

type CurrentBranchProviderProps = {
	branches: GetBranchesResponseDto;
	children: React.ReactNode;
};

export function CurrentBranchProvider({
	branches,
	children,
}: CurrentBranchProviderProps) {
	const [store] = useState(() => {
		const persisted =
			typeof window !== "undefined"
				? localStorage.getItem(CURRENT_BRANCH_STORAGE_KEY)
				: null;

		const isValid =
			persisted !== null && branches.some((branch) => branch.id === persisted);

		const initialCurrentBranchId = isValid
			? persisted
			: (branches[0]?.id ?? null);

		return createStore<CurrentBranchStore>((set) => ({
			currentBranchId: initialCurrentBranchId,
			actions: {
				setCurrentBranch: (id: string) => {
					localStorage.setItem(CURRENT_BRANCH_STORAGE_KEY, id);
					set({ currentBranchId: id });
				},
			},
		}));
	});

	return (
		<CurrentBranchStoreContext.Provider value={store}>
			{children}
		</CurrentBranchStoreContext.Provider>
	);
}

function useCurrentBranchStore<T>(
	selector: (state: CurrentBranchStore) => T,
): T {
	const store = useContext(CurrentBranchStoreContext);
	if (!store) {
		throw new Error(
			"useCurrentBranchStore must be used within a CurrentBranchProvider",
		);
	}
	return useStore(store, selector);
}

export default useCurrentBranchStore;
