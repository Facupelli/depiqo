import type { ReplaceEquipmentTypeAccessoryDefaultsResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { equipmentTypeAccessoryDefaultKeys } from "./equipment-type-accessory-defaults.queries";
import {
	type ReplaceEquipmentAccessoriesVariables,
	replaceEquipmentAccessories,
} from "./replace-equipment-accessories.api";

type ReplaceEquipmentAccessoriesOptions = Omit<
	MutationOptions<
		ReplaceEquipmentTypeAccessoryDefaultsResponseDto,
		ProblemDetailsError,
		ReplaceEquipmentAccessoriesVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useReplaceEquipmentAccessories(
	options?: ReplaceEquipmentAccessoriesOptions,
) {
	return useMutation<
		ReplaceEquipmentTypeAccessoryDefaultsResponseDto,
		ProblemDetailsError,
		ReplaceEquipmentAccessoriesVariables
	>({
		...options,
		mutationFn: replaceEquipmentAccessories,
		meta: {
			invalidates: (variables: ReplaceEquipmentAccessoriesVariables) => [
				equipmentTypeAccessoryDefaultKeys.detail(variables.equipmentTypeId),
			],
			...options?.meta,
		},
	});
}
