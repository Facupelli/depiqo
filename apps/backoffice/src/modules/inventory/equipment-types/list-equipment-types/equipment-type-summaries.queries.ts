import type {
	GetEquipmentTypeSummariesQueryDto,
	GetEquipmentTypeSummariesResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getEquipmentTypeSummaries } from "./get-equipment-type-summaries.api";

export type EquipmentTypeSummariesQueryOverrides<
	TData = GetEquipmentTypeSummariesResponseDto,
> = Omit<
	UseQueryOptions<
		GetEquipmentTypeSummariesResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const equipmentTypeSummaryKeys = {
	all: () => ["v2", "asset-inventory", "equipment-types", "list"] as const,
	list: (query?: GetEquipmentTypeSummariesQueryDto) =>
		[...equipmentTypeSummaryKeys.all(), query ?? {}] as const,
};

export const equipmentTypeSummaryQueries = {
	list: <TData = GetEquipmentTypeSummariesResponseDto>(
		query?: GetEquipmentTypeSummariesQueryDto,
		overrides?: EquipmentTypeSummariesQueryOverrides<TData>,
	) =>
		queryOptions<
			GetEquipmentTypeSummariesResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: equipmentTypeSummaryKeys.list(query),
			queryFn: () => getEquipmentTypeSummaries(query),
			...overrides,
		}),
};

export function useEquipmentTypeSummaries<
	TData = GetEquipmentTypeSummariesResponseDto,
>(
	query?: GetEquipmentTypeSummariesQueryDto,
	overrides?: EquipmentTypeSummariesQueryOverrides<TData>,
) {
	return useQuery(equipmentTypeSummaryQueries.list(query, overrides));
}
