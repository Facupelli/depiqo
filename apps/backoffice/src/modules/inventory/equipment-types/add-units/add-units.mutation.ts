import type { AddAssetsToEquipmentTypeResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { assetKeys } from "@/modules/inventory/assets/assets.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { equipmentTypeSummaryKeys } from "../equipment-type-detail/equipment-type-summary.queries";
import { equipmentTypeAssetsKeys } from "../equipment-type-detail/units/equipment-type-assets.queries";
import { listEquipmentTypeKeys } from "../list-equipment-types/list-equipment-types.queries";
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
				equipmentTypeAssetsKeys.equipmentType(variables.equipmentTypeId),
				equipmentTypeSummaryKeys.summary(variables.equipmentTypeId),
				listEquipmentTypeKeys.lists(),
				assetKeys.all(),
			],
			...options?.meta,
		},
	});
}
