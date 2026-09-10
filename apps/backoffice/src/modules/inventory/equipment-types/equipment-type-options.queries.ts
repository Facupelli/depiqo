import type {
	GetEquipmentTypesQueryDto,
	GetEquipmentTypesResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getEquipmentTypes } from "./equipment-type-options.api";

export type EquipmentTypeOptionsQueryOverrides<
	TData = GetEquipmentTypesResponseDto,
> = Omit<
	UseQueryOptions<GetEquipmentTypesResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

function normalizeEquipmentTypeOptionsQuery(
	query?: GetEquipmentTypesQueryDto,
): GetEquipmentTypesQueryDto {
	return {
		...(query?.search?.trim() ? { search: query.search.trim() } : {}),
		...(query?.limit !== undefined ? { limit: query.limit } : {}),
		...(query?.excludeIds?.length
			? { excludeIds: [...new Set(query.excludeIds)].sort() }
			: {}),
	};
}

export const equipmentTypeOptionKeys = {
	all: () => ["v2", "asset-inventory", "equipment-types", "options"] as const,
	list: (query?: GetEquipmentTypesQueryDto) =>
		[
			...equipmentTypeOptionKeys.all(),
			normalizeEquipmentTypeOptionsQuery(query),
		] as const,
};

export const equipmentTypeOptionQueries = {
	list: <TData = GetEquipmentTypesResponseDto>(
		query?: GetEquipmentTypesQueryDto,
		overrides?: EquipmentTypeOptionsQueryOverrides<TData>,
	) => {
		const normalizedQuery = normalizeEquipmentTypeOptionsQuery(query);

		return queryOptions<
			GetEquipmentTypesResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: equipmentTypeOptionKeys.list(normalizedQuery),
			queryFn: () => getEquipmentTypes(normalizedQuery),
			...overrides,
		});
	},
};

export function useEquipmentTypeOptions<TData = GetEquipmentTypesResponseDto>(
	query?: GetEquipmentTypesQueryDto,
	overrides?: EquipmentTypeOptionsQueryOverrides<TData>,
) {
	return useQuery(equipmentTypeOptionQueries.list(query, overrides));
}
