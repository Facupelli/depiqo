import type { GetEquipmentTypeProductUsagesResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getEquipmentTypeProductUsages } from "./get-equipment-type-product-usages.api";

export type EquipmentTypeProductUsagesQueryOverrides<
	TData = GetEquipmentTypeProductUsagesResponseDto,
> = Omit<
	UseQueryOptions<
		GetEquipmentTypeProductUsagesResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const equipmentTypeProductUsageKeys = {
	all: () => ["v2", "catalog", "equipment-type-product-usages"] as const,
	list: (equipmentTypeIds: string[]) =>
		[...equipmentTypeProductUsageKeys.all(), equipmentTypeIds] as const,
};

export const equipmentTypeProductUsageQueries = {
	list: <TData = GetEquipmentTypeProductUsagesResponseDto>(
		equipmentTypeIds: string[],
		overrides?: EquipmentTypeProductUsagesQueryOverrides<TData>,
	) =>
		queryOptions<
			GetEquipmentTypeProductUsagesResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: equipmentTypeProductUsageKeys.list(equipmentTypeIds),
			queryFn: () => getEquipmentTypeProductUsages(equipmentTypeIds),
			enabled: equipmentTypeIds.length > 0,
			...overrides,
		}),
};

export function useEquipmentTypeProductUsages<
	TData = GetEquipmentTypeProductUsagesResponseDto,
>(
	equipmentTypeIds: string[],
	overrides?: EquipmentTypeProductUsagesQueryOverrides<TData>,
) {
	return useQuery(
		equipmentTypeProductUsageQueries.list(equipmentTypeIds, overrides),
	);
}
