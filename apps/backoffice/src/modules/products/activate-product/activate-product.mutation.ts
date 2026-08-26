import type { ActivateRentableItemResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { productKeys } from "@/modules/products/products.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type ActivateProductVariables,
	activateProduct,
} from "./activate-product.api";

type ActivateProductOptions = Omit<
	MutationOptions<
		ActivateRentableItemResponseDto,
		ProblemDetailsError,
		ActivateProductVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useActivateProduct(options?: ActivateProductOptions) {
	return useMutation<
		ActivateRentableItemResponseDto,
		ProblemDetailsError,
		ActivateProductVariables
	>({
		...options,
		mutationFn: activateProduct,
		meta: {
			invalidates: productKeys.all(),
			...options?.meta,
		},
	});
}
