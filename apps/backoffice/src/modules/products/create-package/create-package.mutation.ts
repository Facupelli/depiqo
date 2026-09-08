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
import { createPackage } from "./create-package.api";

type CreatePackageOptions = Omit<
	MutationOptions<
		CreatePackageResponseDto,
		ProblemDetailsError,
		CreatePackageBodyDto
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreatePackage(options?: CreatePackageOptions) {
	return useMutation<
		CreatePackageResponseDto,
		ProblemDetailsError,
		CreatePackageBodyDto
	>({
		...options,
		mutationFn: createPackage,
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
