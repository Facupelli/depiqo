import type { UpdateRentableItemDefinitionResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import {
	equipmentTypeRentalUsageKeys,
	listEquipmentTypeKeys,
} from "@/modules/inventory/equipment-types/public";
import { productKeys } from "@/modules/products/products.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type UpdateRentableItemDefinitionVariables,
	updateRentableItemDefinition,
} from "../rentable-item-detail/update-rentable-item-definition.api";

type UpdateProductOptions = Omit<
	MutationOptions<
		UpdateRentableItemDefinitionResponseDto,
		ProblemDetailsError,
		UpdateRentableItemDefinitionVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useUpdateProduct(options?: UpdateProductOptions) {
	return useMutation<
		UpdateRentableItemDefinitionResponseDto,
		ProblemDetailsError,
		UpdateRentableItemDefinitionVariables
	>({
		...options,
		mutationFn: updateRentableItemDefinition,
		meta: {
			invalidates: [
				productKeys.all(),
				listEquipmentTypeKeys.lists(),
				equipmentTypeRentalUsageKeys.all(),
			],
			...options?.meta,
		},
	});
}
