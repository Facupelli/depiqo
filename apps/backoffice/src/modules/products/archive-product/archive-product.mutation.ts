import type { ArchiveRentableItemResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { productKeys } from "@/modules/products/products.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type ArchiveProductVariables,
	archiveProduct,
} from "./archive-product.api";

type ArchiveProductOptions = Omit<
	MutationOptions<
		ArchiveRentableItemResponseDto,
		ProblemDetailsError,
		ArchiveProductVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useArchiveProduct(options?: ArchiveProductOptions) {
	return useMutation<
		ArchiveRentableItemResponseDto,
		ProblemDetailsError,
		ArchiveProductVariables
	>({
		...options,
		mutationFn: archiveProduct,
		meta: {
			invalidates: productKeys.all(),
			...options?.meta,
		},
	});
}
