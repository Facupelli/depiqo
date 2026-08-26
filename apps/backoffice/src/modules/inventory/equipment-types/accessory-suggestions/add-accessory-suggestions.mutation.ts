import type { CreateEquipmentTypeAccessoryDefaultsResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { equipmentTypeDetailKeys } from "../equipment-type-detail/equipment-type-detail.queries";
import { equipmentTypeSummaryKeys } from "../list-equipment-types/equipment-type-summaries.queries";
import {
	addAccessorySuggestions,
	type CreateEquipmentTypeAccessoryDefaultsVariables,
} from "./add-accessory-suggestions.api";

type CreateEquipmentTypeAccessoryDefaultsOptions = Omit<
	MutationOptions<
		CreateEquipmentTypeAccessoryDefaultsResponseDto,
		ProblemDetailsError,
		CreateEquipmentTypeAccessoryDefaultsVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useAddAccessorySuggestions(
	options?: CreateEquipmentTypeAccessoryDefaultsOptions,
) {
	return useMutation<
		CreateEquipmentTypeAccessoryDefaultsResponseDto,
		ProblemDetailsError,
		CreateEquipmentTypeAccessoryDefaultsVariables
	>({
		...options,
		mutationFn: addAccessorySuggestions,
		meta: {
			invalidates: (
				variables: CreateEquipmentTypeAccessoryDefaultsVariables,
			) => [
				equipmentTypeDetailKeys.detail(variables.equipmentTypeId),
				equipmentTypeSummaryKeys.all(),
			],
			...options?.meta,
		},
	});
}
