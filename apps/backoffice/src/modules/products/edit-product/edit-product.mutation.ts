import type { UpdateRentableItemDefinitionResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { productKeys } from "@/modules/products/products.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { type UpdateProductVariables, updateProduct } from "./edit-product.api";

type UpdateProductOptions = Omit<
	MutationOptions<
		UpdateRentableItemDefinitionResponseDto,
		ProblemDetailsError,
		UpdateProductVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useUpdateProduct(options?: UpdateProductOptions) {
	return useMutation<
		UpdateRentableItemDefinitionResponseDto,
		ProblemDetailsError,
		UpdateProductVariables
	>({
		...options,
		mutationFn: updateProduct,
		meta: {
			invalidates: productKeys.all(),
			...options?.meta,
		},
	});
}
