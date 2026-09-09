import type {
	CreatePackageBodyDto,
	CreatePackageResponseDto,
} from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import {
	equipmentTypeRentalUsageKeys,
	listEquipmentTypeKeys,
} from "@/modules/inventory/equipment-types/public";
import { productKeys } from "@/modules/products/products.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { createCombo } from "./create-combo.api";

type CreateComboOptions = Omit<
	MutationOptions<
		CreatePackageResponseDto,
		ProblemDetailsError,
		CreatePackageBodyDto
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateCombo(options?: CreateComboOptions) {
	return useMutation<
		CreatePackageResponseDto,
		ProblemDetailsError,
		CreatePackageBodyDto
	>({
		...options,
		mutationFn: createCombo,
		meta: {
			invalidates: (variables: CreatePackageBodyDto) => [
				productKeys.lists(),
				listEquipmentTypeKeys.lists(),
				...variables.requirements.map((requirement) =>
					equipmentTypeRentalUsageKeys.detail(requirement.equipmentTypeId),
				),
			],
			...options?.meta,
		},
	});
}
