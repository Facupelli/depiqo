import type { UpdateEquipmentTypeResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { productKeys } from "@/modules/products/products.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { equipmentTypeSummaryKeys } from "../equipment-type-detail/equipment-type-summary.queries";
import { equipmentTypeOptionKeys } from "../equipment-type-options.queries";
import { listEquipmentTypeKeys } from "../list-equipment-types/list-equipment-types.queries";
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
				equipmentTypeSummaryKeys.summary(variables.equipmentTypeId),
				listEquipmentTypeKeys.lists(),
				equipmentTypeOptionKeys.all(),
				productKeys.all(),
			],
			...options?.meta,
		},
	});
}
