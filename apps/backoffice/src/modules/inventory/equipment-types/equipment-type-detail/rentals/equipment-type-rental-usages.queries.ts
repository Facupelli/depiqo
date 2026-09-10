import type { GetEquipmentTypeRentalUsagesResponseDto } from "@repo/api-contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { equipmentTypeRentalUsageKeys } from "../../equipment-type-rental-usage.keys";
import { getEquipmentTypeRentalUsages } from "./get-equipment-type-rental-usages.api";

export const equipmentTypeRentalUsageQueries = {
	detail: (equipmentTypeId: string) =>
		queryOptions<GetEquipmentTypeRentalUsagesResponseDto, ProblemDetailsError>({
			queryKey: equipmentTypeRentalUsageKeys.detail(equipmentTypeId),
			queryFn: () => getEquipmentTypeRentalUsages(equipmentTypeId),
		}),
};

export function useEquipmentTypeRentalUsages(equipmentTypeId: string) {
	return useQuery(equipmentTypeRentalUsageQueries.detail(equipmentTypeId));
}
