export const LOCATION_STORAGE_KEY = "selectedLocationId";

type LocationState = {
	locationId: string;
};

type LocationActions = {
	actions: {
		setLocation: (id: string) => void;
	};
};

export type LocationStore = LocationState & LocationActions;
