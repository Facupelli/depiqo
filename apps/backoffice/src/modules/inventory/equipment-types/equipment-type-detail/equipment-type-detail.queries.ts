import type { GetEquipmentTypeDetailResponseDto } from "@repo/api-contracts";
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getEquipmentTypeDetail } from "./get-equipment-type-detail.api";

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

export const equipmentTypeDetailKeys = {
	all: () => ["v2", "asset-inventory", "equipment-types", "detail"] as const,
	detail: (equipmentTypeId?: string) =>
		[...equipmentTypeDetailKeys.all(), equipmentTypeId] as const,
};

export const equipmentTypeDetailQueries = {
	detail: <TData = GetEquipmentTypeDetailResponseDto>(
		equipmentTypeId?: string,
		overrides?: EquipmentTypeDetailQueryOverrides<TData>,
	) =>
		queryOptions<GetEquipmentTypeDetailResponseDto, ProblemDetailsError, TData>(
			{
				queryKey: equipmentTypeDetailKeys.detail(equipmentTypeId),
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
