import type { CreateEquipmentTypeResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { equipmentTypeKeys } from "../equipment-types.queries";
import {
	type CreateEquipmentTypeVariables,
	createEquipmentType,
} from "./create-equipment-type.api";

type CreateEquipmentTypeOptions = Omit<
	MutationOptions<
		CreateEquipmentTypeResponseDto,
		ProblemDetailsError,
		CreateEquipmentTypeVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateEquipmentType(options?: CreateEquipmentTypeOptions) {
	return useMutation<
		CreateEquipmentTypeResponseDto,
		ProblemDetailsError,
		CreateEquipmentTypeVariables
	>({
		...options,
		mutationFn: createEquipmentType,
		meta: {
			invalidates: [equipmentTypeKeys.lists(), equipmentTypeKeys.options()],
			...options?.meta,
		},
	});
}
