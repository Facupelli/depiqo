import type { GetEquipmentTypeAccessoryDefaultsResponseDto } from "@repo/api-contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getEquipmentTypeAccessoryDefaults } from "./get-equipment-type-accessory-defaults.api";

export const equipmentTypeAccessoryDefaultKeys = {
	all: () =>
		["v2", "asset-inventory", "equipment-types", "accessory-defaults"] as const,
	detail: (equipmentTypeId: string) =>
		[...equipmentTypeAccessoryDefaultKeys.all(), equipmentTypeId] as const,
};

export const equipmentTypeAccessoryDefaultQueries = {
	detail: (equipmentTypeId: string) =>
		queryOptions<
			GetEquipmentTypeAccessoryDefaultsResponseDto,
			ProblemDetailsError
		>({
			queryKey: equipmentTypeAccessoryDefaultKeys.detail(equipmentTypeId),
			queryFn: () => getEquipmentTypeAccessoryDefaults(equipmentTypeId),
		}),
};

export function useEquipmentTypeAccessoryDefaults(equipmentTypeId: string) {
	return useQuery(equipmentTypeAccessoryDefaultQueries.detail(equipmentTypeId));
}
