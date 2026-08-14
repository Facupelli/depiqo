import useLocationStore from "./location.context";

export const useLocationId = () =>
	useLocationStore((state) => state.locationId);

export function useSelectedLocation<T extends { id: string }>(locations: T[]) {
	const locationId = useLocationId();

	return locations.find((location) => location.id === locationId);
}

export const useLocationActions = () =>
	useLocationStore((state) => state.actions);
