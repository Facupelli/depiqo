import type {
	GetEquipmentTypeAssetsQueryDto,
	GetEquipmentTypeAssetsResponseDto,
} from "@repo/api-contracts";
import {
	keepPreviousData,
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	getEquipmentTypeAssets,
	normalizeEquipmentTypeAssetsQuery,
} from "./get-equipment-type-assets.api";

type EquipmentTypeAssetsQueryOverrides = Omit<
	UseQueryOptions<
		GetEquipmentTypeAssetsResponseDto,
		ProblemDetailsError,
		GetEquipmentTypeAssetsResponseDto
	>,
	"queryKey" | "queryFn"
>;

export const equipmentTypeAssetsKeys = {
	all: () => ["v2", "asset-inventory", "equipment-types", "assets"] as const,
	lists: () => [...equipmentTypeAssetsKeys.all(), "list"] as const,
	equipmentType: (equipmentTypeId: string) =>
		[...equipmentTypeAssetsKeys.lists(), equipmentTypeId] as const,
	list: (equipmentTypeId: string, query: GetEquipmentTypeAssetsQueryDto) =>
		[
			...equipmentTypeAssetsKeys.equipmentType(equipmentTypeId),
			normalizeEquipmentTypeAssetsQuery(query),
		] as const,
};

export const equipmentTypeAssetsQueries = {
	list: (
		equipmentTypeId: string,
		query: GetEquipmentTypeAssetsQueryDto,
		overrides?: EquipmentTypeAssetsQueryOverrides,
	) => {
		const normalizedQuery = normalizeEquipmentTypeAssetsQuery(query);
		return queryOptions<GetEquipmentTypeAssetsResponseDto, ProblemDetailsError>(
			{
				queryKey: equipmentTypeAssetsKeys.list(
					equipmentTypeId,
					normalizedQuery,
				),
				queryFn: () => getEquipmentTypeAssets(equipmentTypeId, normalizedQuery),
				placeholderData: keepPreviousData,
				...overrides,
			},
		);
	},
};

export function useEquipmentTypeAssets(
	equipmentTypeId: string,
	query: GetEquipmentTypeAssetsQueryDto,
) {
	return useQuery(equipmentTypeAssetsQueries.list(equipmentTypeId, query));
}
