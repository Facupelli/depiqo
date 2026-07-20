import type { CreateEquipmentTypeAccessoryDefaultsResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { equipmentTypeKeys } from "../equipment-types.queries";
import {
	type CreateEquipmentTypeAccessoryDefaultsVariables,
	createEquipmentTypeAccessoryDefaults,
} from "./create-equipment-type-accessory-defaults.api";

type CreateEquipmentTypeAccessoryDefaultsOptions = Omit<
	MutationOptions<
		CreateEquipmentTypeAccessoryDefaultsResponseDto,
		ProblemDetailsError,
		CreateEquipmentTypeAccessoryDefaultsVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateEquipmentTypeAccessoryDefaults(
	options?: CreateEquipmentTypeAccessoryDefaultsOptions,
) {
	return useMutation<
		CreateEquipmentTypeAccessoryDefaultsResponseDto,
		ProblemDetailsError,
		CreateEquipmentTypeAccessoryDefaultsVariables
	>({
		...options,
		mutationFn: createEquipmentTypeAccessoryDefaults,
		meta: {
			invalidates: (
				variables: CreateEquipmentTypeAccessoryDefaultsVariables,
			) => [
				equipmentTypeKeys.detail(variables.equipmentTypeId),
				equipmentTypeKeys.lists(),
			],
			...options?.meta,
		},
	});
}
