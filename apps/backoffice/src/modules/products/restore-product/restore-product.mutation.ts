import type { RestoreRentableItemResponseDto } from "@repo/api-contracts";
import { useMutation } from "@tanstack/react-query";
import {
	equipmentTypeRentalUsageKeys,
	listEquipmentTypeKeys,
} from "@/modules/inventory/equipment-types/public";
import { productKeys } from "@/modules/products/products.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type RestoreProductVariables,
	restoreProduct,
} from "./restore-product.api";

export function useRestoreProduct() {
	return useMutation<
		RestoreRentableItemResponseDto,
		ProblemDetailsError,
		RestoreProductVariables
	>({
		mutationFn: restoreProduct,
		meta: {
			invalidates: [
				productKeys.all(),
				listEquipmentTypeKeys.lists(),
				equipmentTypeRentalUsageKeys.all(),
			],
		},
	});
}
