import type { AddAssetsToEquipmentTypeResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { equipmentTypeDetailKeys } from "../equipment-type-detail/equipment-type-detail.queries";
import { equipmentTypeSummaryKeys } from "../list-equipment-types/equipment-type-summaries.queries";
import {
	type AddAssetsToEquipmentTypeVariables,
	addAssetsToEquipmentType,
} from "./add-units.api";

type AddUnitsOptions = Omit<
	MutationOptions<
		AddAssetsToEquipmentTypeResponseDto,
		ProblemDetailsError,
		AddAssetsToEquipmentTypeVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useAddUnitsToEquipmentType(options?: AddUnitsOptions) {
	return useMutation<
		AddAssetsToEquipmentTypeResponseDto,
		ProblemDetailsError,
		AddAssetsToEquipmentTypeVariables
	>({
		...options,
		mutationFn: addAssetsToEquipmentType,
		meta: {
			invalidates: (variables: AddAssetsToEquipmentTypeVariables) => [
				equipmentTypeDetailKeys.detail(variables.equipmentTypeId),
				equipmentTypeSummaryKeys.all(),
			],
			...options?.meta,
		},
	});
}
