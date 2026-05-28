import type { AddAssetsToEquipmentTypeResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { equipmentTypeKeys } from "../equipment-types.queries";
import {
	type AddAssetsToEquipmentTypeVariables,
	addAssetsToEquipmentType,
} from "./add-assets-to-equipment-type.api";

type AddAssetsToEquipmentTypeOptions = Omit<
	MutationOptions<
		AddAssetsToEquipmentTypeResponseDto,
		ProblemDetailsError,
		AddAssetsToEquipmentTypeVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useAddAssetsToEquipmentType(
	options?: AddAssetsToEquipmentTypeOptions,
) {
	return useMutation<
		AddAssetsToEquipmentTypeResponseDto,
		ProblemDetailsError,
		AddAssetsToEquipmentTypeVariables
	>({
		...options,
		mutationFn: addAssetsToEquipmentType,
		meta: {
			invalidates: (variables: AddAssetsToEquipmentTypeVariables) => [
				equipmentTypeKeys.detail(variables.equipmentTypeId),
				equipmentTypeKeys.lists(),
			],
			...options?.meta,
		},
	});
}
