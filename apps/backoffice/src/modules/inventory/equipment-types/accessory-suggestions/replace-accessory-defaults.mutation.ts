import type { ReplaceEquipmentTypeAccessoryDefaultsResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { equipmentTypeDetailKeys } from "../equipment-type-detail/equipment-type-detail.queries";
import { equipmentTypeSummaryKeys } from "../list-equipment-types/equipment-type-summaries.queries";
import {
	type ReplaceEquipmentTypeAccessoryDefaultsVariables,
	replaceAccessoryDefaults,
} from "./replace-accessory-defaults.api";

type ReplaceEquipmentTypeAccessoryDefaultsOptions = Omit<
	MutationOptions<
		ReplaceEquipmentTypeAccessoryDefaultsResponseDto,
		ProblemDetailsError,
		ReplaceEquipmentTypeAccessoryDefaultsVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useReplaceAccessoryDefaults(
	options?: ReplaceEquipmentTypeAccessoryDefaultsOptions,
) {
	return useMutation<
		ReplaceEquipmentTypeAccessoryDefaultsResponseDto,
		ProblemDetailsError,
		ReplaceEquipmentTypeAccessoryDefaultsVariables
	>({
		...options,
		mutationFn: replaceAccessoryDefaults,
		meta: {
			invalidates: (
				variables: ReplaceEquipmentTypeAccessoryDefaultsVariables,
			) => [
				equipmentTypeDetailKeys.detail(variables.equipmentTypeId),
				equipmentTypeSummaryKeys.all(),
			],
			...options?.meta,
		},
	});
}
