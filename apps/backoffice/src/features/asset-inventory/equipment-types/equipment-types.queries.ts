import type {
	GetEquipmentTypeDetailResponseDto,
	GetEquipmentTypeSummariesQueryDto,
	GetEquipmentTypeSummariesResponseDto,
	GetEquipmentTypesQueryDto,
	GetEquipmentTypesResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getEquipmentTypeDetail } from "./get-equipment-type-detail/get-equipment-type-detail.api";
import { getEquipmentTypeSummaries } from "./get-equipment-type-summaries/get-equipment-type-summaries.api";
import { getEquipmentTypes } from "./get-equipment-types/get-equipment-types.api";

export type EquipmentTypesQueryOverrides<TData = GetEquipmentTypesResponseDto> =
	Omit<
		UseQueryOptions<GetEquipmentTypesResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

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

export type EquipmentTypeDetailQueryOverrides<
	TData = GetEquipmentTypeDetailResponseDto,
> = Omit<
	UseQueryOptions<
		GetEquipmentTypeDetailResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const equipmentTypeKeys = {
	all: () => ["v2", "asset-inventory", "equipment-types"] as const,
	lists: () => [...equipmentTypeKeys.all(), "list"] as const,
	list: (query?: GetEquipmentTypeSummariesQueryDto) =>
		[...equipmentTypeKeys.lists(), query ?? {}] as const,
	options: () => [...equipmentTypeKeys.all(), "options"] as const,
	optionList: (query?: GetEquipmentTypesQueryDto) =>
		[...equipmentTypeKeys.options(), query ?? {}] as const,
	details: () => [...equipmentTypeKeys.all(), "detail"] as const,
	detail: (equipmentTypeId?: string) =>
		[...equipmentTypeKeys.details(), equipmentTypeId] as const,
};

export const equipmentTypeQueries = {
	list: <TData = GetEquipmentTypeSummariesResponseDto>(
		query?: GetEquipmentTypeSummariesQueryDto,
		overrides?: EquipmentTypeSummariesQueryOverrides<TData>,
	) =>
		queryOptions<
			GetEquipmentTypeSummariesResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: equipmentTypeKeys.list(query),
			queryFn: () => getEquipmentTypeSummaries(query),
			...overrides,
		}),
	options: <TData = GetEquipmentTypesResponseDto>(
		query?: GetEquipmentTypesQueryDto,
		overrides?: EquipmentTypesQueryOverrides<TData>,
	) =>
		queryOptions<GetEquipmentTypesResponseDto, ProblemDetailsError, TData>({
			queryKey: equipmentTypeKeys.optionList(query),
			queryFn: () => getEquipmentTypes(query),
			...overrides,
		}),
	detail: <TData = GetEquipmentTypeDetailResponseDto>(
		equipmentTypeId?: string,
		overrides?: EquipmentTypeDetailQueryOverrides<TData>,
	) =>
		queryOptions<GetEquipmentTypeDetailResponseDto, ProblemDetailsError, TData>(
			{
				queryKey: equipmentTypeKeys.detail(equipmentTypeId),
				queryFn: () => {
					if (!equipmentTypeId) {
						throw new Error(
							"equipmentTypeId is required to fetch equipment type detail.",
						);
					}

					return getEquipmentTypeDetail(equipmentTypeId);
				},
				enabled: !!equipmentTypeId,
				...overrides,
			},
		),
};

export function useEquipmentTypeSummaries<
	TData = GetEquipmentTypeSummariesResponseDto,
>(
	query?: GetEquipmentTypeSummariesQueryDto,
	overrides?: EquipmentTypeSummariesQueryOverrides<TData>,
) {
	return useQuery(equipmentTypeQueries.list(query, overrides));
}

export function useEquipmentTypes<TData = GetEquipmentTypesResponseDto>(
	query?: GetEquipmentTypesQueryDto,
	overrides?: EquipmentTypesQueryOverrides<TData>,
) {
	return useQuery(equipmentTypeQueries.options(query, overrides));
}

export function useEquipmentTypeDetail<
	TData = GetEquipmentTypeDetailResponseDto,
>(
	equipmentTypeId?: string,
	overrides?: EquipmentTypeDetailQueryOverrides<TData>,
) {
	return useQuery(equipmentTypeQueries.detail(equipmentTypeId, overrides));
}
