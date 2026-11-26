import { queryOptions } from "@tanstack/react-query";
import {
	getUnitAvailability,
	type UnitAvailabilityInput,
} from "./unit-availability.api";

export function unitAvailabilityQuery(
	input: UnitAvailabilityInput,
	canReadRentals: boolean,
) {
	const normalized = {
		...input,
		equipmentTypeIds: [...new Set(input.equipmentTypeIds)].sort(),
		assetIds: [...new Set(input.assetIds)].sort(),
	};

	return queryOptions({
		queryKey: [
			"v2",
			"asset-inventory",
			"availability-timeline",
			canReadRentals,
			normalized,
		] as const,
		queryFn: ({ signal }) => getUnitAvailability(normalized, signal),
	});
}
