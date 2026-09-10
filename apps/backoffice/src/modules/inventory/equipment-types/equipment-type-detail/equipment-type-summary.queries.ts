import type { GetEquipmentTypeSummaryResponseDto } from "@repo/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getEquipmentTypeSummary } from "./get-equipment-type-summary.api";

export const equipmentTypeSummaryKeys = {
	all: () => ["v2", "asset-inventory", "equipment-types", "summary"] as const,
	summary: (equipmentTypeId: string) =>
		[...equipmentTypeSummaryKeys.all(), equipmentTypeId] as const,
};

export const equipmentTypeSummaryQueries = {
	summary: (equipmentTypeId: string) =>
		queryOptions<GetEquipmentTypeSummaryResponseDto, ProblemDetailsError>({
			queryKey: equipmentTypeSummaryKeys.summary(equipmentTypeId),
			queryFn: () => getEquipmentTypeSummary(equipmentTypeId),
		}),
};
