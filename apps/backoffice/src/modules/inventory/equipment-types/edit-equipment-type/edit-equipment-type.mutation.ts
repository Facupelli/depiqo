import type { UpdateEquipmentTypeResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { equipmentTypeDetailKeys } from "../equipment-type-detail/equipment-type-detail.queries";
import { equipmentTypeSummaryKeys } from "../list-equipment-types/equipment-type-summaries.queries";
import {
	type UpdateEquipmentTypeVariables,
	updateEquipmentType,
} from "./edit-equipment-type.api";

type UpdateEquipmentTypeOptions = Omit<
	MutationOptions<
		UpdateEquipmentTypeResponseDto,
		ProblemDetailsError,
		UpdateEquipmentTypeVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useUpdateEquipmentType(options?: UpdateEquipmentTypeOptions) {
	return useMutation<
		UpdateEquipmentTypeResponseDto,
		ProblemDetailsError,
		UpdateEquipmentTypeVariables
	>({
		...options,
		mutationFn: updateEquipmentType,
		meta: {
			invalidates: (variables: UpdateEquipmentTypeVariables) => [
				equipmentTypeDetailKeys.detail(variables.equipmentTypeId),
				equipmentTypeSummaryKeys.all(),
			],
			...options?.meta,
		},
	});
}
