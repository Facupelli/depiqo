import type { GetBranchesResponseDto } from "@repo/api-contracts";
import type React from "react";
import { createContext, useContext, useState } from "react";
import { createStore, type StoreApi, useStore } from "zustand";
import { LOCATION_STORAGE_KEY, type LocationStore } from "./location.types";

const LocationStoreContext = createContext<StoreApi<LocationStore> | null>(
	null,
);

type LocationStoreProviderProps = {
	branches: GetBranchesResponseDto;
	children: React.ReactNode;
};

export function LocationStoreProvider({
	branches,
	children,
}: LocationStoreProviderProps) {
	const [store] = useState(() => {
		const persisted =
			typeof window !== "undefined"
				? localStorage.getItem(LOCATION_STORAGE_KEY)
				: null;

		const isValid =
			persisted !== null && branches.some((loc) => loc.id === persisted);

		const initialLocationId = isValid ? persisted : (branches[0]?.id ?? null);

		return createStore<LocationStore>((set) => ({
			locationId: initialLocationId,
			actions: {
				setLocation: (id: string) => {
					localStorage.setItem(LOCATION_STORAGE_KEY, id);
					set({ locationId: id });
				},
			},
		}));
	});

	return (
		<LocationStoreContext.Provider value={store}>
			{children}
		</LocationStoreContext.Provider>
	);
}

function useLocationStore<T>(selector: (state: LocationStore) => T): T {
	const store = useContext(LocationStoreContext);
	if (!store) {
		throw new Error(
			"useLocationStore must be used within a LocationStoreProvider",
		);
	}
	return useStore(store, selector);
}

export default useLocationStore;
