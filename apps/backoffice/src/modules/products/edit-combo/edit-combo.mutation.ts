import type { UpdateRentableItemDefinitionResponseDto } from "@repo/api-contracts";
import { type MutationOptions, useMutation } from "@tanstack/react-query";
import {
	equipmentTypeRentalUsageKeys,
	listEquipmentTypeKeys,
} from "@/modules/inventory/equipment-types/public";
import type { ProblemDetailsError } from "@/shared/errors";
import { productKeys } from "../products.queries";
import {
	type UpdateRentableItemDefinitionVariables,
	updateRentableItemDefinition,
} from "../rentable-item-detail/update-rentable-item-definition.api";
export type UpdateComboVariables = UpdateRentableItemDefinitionVariables & {
	originalEquipmentTypeIds: string[];
};
type Options = Omit<
	MutationOptions<
		UpdateRentableItemDefinitionResponseDto,
		ProblemDetailsError,
		UpdateComboVariables
	>,
	"mutationFn" | "mutationKey"
>;
export function useUpdateCombo(options?: Options) {
	return useMutation({
		...options,
		mutationFn: ({
			originalEquipmentTypeIds: _ids,
			...variables
		}: UpdateComboVariables) => updateRentableItemDefinition(variables),
		meta: {
			invalidates: (variables: UpdateComboVariables) => {
				const ids = new Set([
					...variables.originalEquipmentTypeIds,
					...(variables.body.requirements ?? []).map(
						(item) => item.equipmentTypeId,
					),
				]);
				return [
					productKeys.detail(variables.rentableItemId),
					productKeys.lists(),
					listEquipmentTypeKeys.lists(),
					...[...ids].map((id) => equipmentTypeRentalUsageKeys.detail(id)),
				];
			},
			...options?.meta,
		},
	});
}
