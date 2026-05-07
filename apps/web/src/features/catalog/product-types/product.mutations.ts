import type {
	CreateProductTypeDto,
	ReplaceProductTypeAccessoryLinksDto,
	UpdateProductTypeDto,
} from "@repo/schemas";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { ProblemDetailsError } from "@/shared/errors";
import {
	createProduct,
	publishProductType,
	replaceProductTypeAccessoryLinks,
	retireProductType,
	updateProductType,
} from "./products.api";
import { productKeys } from "./products.queries";

type CreateProductOptions = Omit<
	MutationOptions<string, ProblemDetailsError, CreateProductTypeDto>,
	"mutationFn" | "mutationKey"
>;

type ProductLifecycleOptions = Omit<
	MutationOptions<void, ProblemDetailsError, { productTypeId: string }>,
	"mutationFn" | "mutationKey"
>;

type UpdateProductOptions = Omit<
	MutationOptions<
		void,
		ProblemDetailsError,
		{ productTypeId: string; dto: UpdateProductTypeDto }
	>,
	"mutationFn" | "mutationKey"
>;

type ReplaceProductTypeAccessoryLinksOptions = Omit<
	MutationOptions<
		void,
		ProblemDetailsError,
		{ productTypeId: string; dto: ReplaceProductTypeAccessoryLinksDto }
	>,
	"mutationFn" | "mutationKey"
>;

// -------------------------------------------------------
// Mutations
// Invalidation is handled globally via MutationCache + meta.
// See: query-client.ts for the global onSettled handler.
// -------------------------------------------------------

export function useCreateProduct(options?: CreateProductOptions) {
	return useMutation<string, ProblemDetailsError, CreateProductTypeDto>({
		...options,
		mutationFn: (data) => createProduct({ data }),
		meta: {
			// Invalidates all product lists on success
			invalidates: productKeys.lists(),
		},
	});
}

export function useUpdateProductType(options?: UpdateProductOptions) {
	return useMutation<
		void,
		ProblemDetailsError,
		{ productTypeId: string; dto: UpdateProductTypeDto }
	>({
		...options,
		mutationFn: ({ productTypeId, dto }) =>
			updateProductType({ data: { productTypeId, dto } }),
		meta: {
			invalidates: productKeys.all(),
		},
	});
}

export function usePublishProductType(options?: ProductLifecycleOptions) {
	return useMutation<void, ProblemDetailsError, { productTypeId: string }>({
		...options,
		mutationFn: async (data) => {
			const result = await publishProductType({ data });
			if (typeof result === "object" && result !== null && "error" in result) {
				throw new ProblemDetailsError(result.error);
			}
		},
		meta: {
			// Invalidates all product details on success (surgical: lists stay intact)
			invalidates: productKeys.details(),
		},
	});
}

export function useRetireProductType(options?: ProductLifecycleOptions) {
	return useMutation<void, ProblemDetailsError, { productTypeId: string }>({
		...options,
		mutationFn: (data) => retireProductType({ data }),
		meta: {
			invalidates: productKeys.details(),
		},
	});
}

export function useReplaceProductTypeAccessoryLinks(
	options?: ReplaceProductTypeAccessoryLinksOptions,
) {
	return useMutation<
		void,
		ProblemDetailsError,
		{ productTypeId: string; dto: ReplaceProductTypeAccessoryLinksDto }
	>({
		...options,
		mutationFn: ({ productTypeId, dto }) =>
			replaceProductTypeAccessoryLinks({ data: { productTypeId, dto } }),
		meta: {
			invalidates: (variables) => [
				productKeys.detail(variables.productTypeId),
				productKeys.accessoryLinks(variables.productTypeId),
			],
		},
	});
}
