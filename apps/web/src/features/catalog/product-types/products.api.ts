import {
	type CreateProductTypeDto,
	createProductTypeSchema,
	type GetAvailableAccessoriesQuery,
	getAvailableAccessoriesQuerySchema,
	type GetProductTimelineQuery,
	type GetProductTypesQuery,
	getProductTimelineQuerySchema,
	getProductTypesQuerySchema,
	type PaginatedDto,
	type ProblemDetails,
	type ProductTypeAccessoryLinkResponse,
	type ProductTimelineResponse,
	type ProductTypeResponse,
	type ReplaceProductTypeAccessoryLinksDto,
	replaceProductTypeAccessoryLinksSchema,
	type UpdateProductTypeDto,
	updateProductTypeSchema,
} from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import {
	authenticatedApiFetch as apiFetch,
	authenticatedApiFetchPaginated as apiFetchPaginated,
} from "@/lib/api-auth";
import { ProblemDetailsError } from "@/shared/errors";

const apiUrl = "/product-types";

export const createProduct = createServerFn({ method: "POST" })
	.inputValidator((data: CreateProductTypeDto) =>
		createProductTypeSchema.parse(data),
	)
	.handler(async ({ data }): Promise<string> => {
		const result = await apiFetch<string>(apiUrl, {
			method: "POST",
			body: data,
		});

		return result;
	});

const updateProductSchema = z.object({
	productTypeId: z.uuid(),
	dto: updateProductTypeSchema,
});

const productTypeAccessoryLinksParamsSchema = z.object({
	productTypeId: z.uuid(),
});

const replaceProductTypeAccessoryLinksInputSchema = z.object({
	productTypeId: z.uuid(),
	dto: replaceProductTypeAccessoryLinksSchema,
});

const availableAccessoriesInputSchema = z.object({
	productTypeId: z.uuid(),
	params: getAvailableAccessoriesQuerySchema,
});

export const updateProductType = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { productTypeId: string; dto: UpdateProductTypeDto }) =>
			updateProductSchema.parse(data),
	)
	.handler(async ({ data }): Promise<void> => {
		await apiFetch<void>(`${apiUrl}/${data.productTypeId}`, {
			method: "PATCH",
			body: data.dto,
		});
	});

export interface GetProductDetailParams {
	productId: string;
}

const productDetailParamsSchema = z.object({
	productId: z.uuid(),
});

export const getProductDetail = createServerFn({ method: "GET" })
	.inputValidator((data: GetProductDetailParams) =>
		productDetailParamsSchema.parse(data),
	)
	.handler(async ({ data }): Promise<ProductTypeResponse> => {
		const result = await apiFetch<ProductTypeResponse>(
			`${apiUrl}/${data.productId}`,
			{
				method: "GET",
			},
		);

		return result;
	});

export const getProductTypeAccessoryLinks = createServerFn({ method: "GET" })
	.inputValidator((data: { productTypeId: string }) =>
		productTypeAccessoryLinksParamsSchema.parse(data),
	)
	.handler(async ({ data }): Promise<ProductTypeAccessoryLinkResponse[]> => {
		const result = await apiFetch<ProductTypeAccessoryLinkResponse[]>(
			`${apiUrl}/${data.productTypeId}/accessory-links`,
			{
				method: "GET",
			},
		);

		return result;
	});

export const replaceProductTypeAccessoryLinks = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: { productTypeId: string; dto: ReplaceProductTypeAccessoryLinksDto }) =>
			replaceProductTypeAccessoryLinksInputSchema.parse(data),
	)
	.handler(async ({ data }): Promise<void> => {
		await apiFetch<void>(`${apiUrl}/${data.productTypeId}/accessory-links`, {
			method: "PUT",
			body: data.dto,
		});
	});

export const getAvailableProductTypeAccessories = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: { productTypeId: string; params: GetAvailableAccessoriesQuery }) =>
			availableAccessoriesInputSchema.parse(data),
	)
	.handler(async ({ data }): Promise<PaginatedDto<ProductTypeResponse>> => {
		const result = await apiFetchPaginated<ProductTypeResponse>(
			`${apiUrl}/${data.productTypeId}/available-accessories`,
			{
				method: "GET",
				params: data.params,
			},
		);

		return result;
	});

export const getProducts = createServerFn({ method: "GET" })
	.inputValidator((data: GetProductTypesQuery) =>
		getProductTypesQuerySchema.parse(data),
	)
	.handler(async ({ data }): Promise<PaginatedDto<ProductTypeResponse>> => {
		const result = await apiFetchPaginated<ProductTypeResponse>(apiUrl, {
			method: "GET",
			params: data,
		});

		return result;
	});

export const getProductTimeline = createServerFn({ method: "GET" })
	.inputValidator((data: GetProductTimelineQuery) =>
		getProductTimelineQuerySchema.parse(data),
	)
	.handler(async ({ data }): Promise<ProductTimelineResponse> => {
		const result = await apiFetch<ProductTimelineResponse>(
			"/inventory/product-timeline",
			{
				method: "GET",
				params: data,
			},
		);

		return result;
	});

export const publishProductType = createServerFn({ method: "POST" })
	.inputValidator((data: { productTypeId: string }) => data)
	.handler(async ({ data }): Promise<void | { error: ProblemDetails }> => {
		try {
			await apiFetch<void>(`${apiUrl}/${data.productTypeId}/publish`, {
				method: "PATCH",
			});
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				return { error: error.problemDetails };
			}
			throw error;
		}
	});

export const retireProductType = createServerFn({ method: "POST" })
	.inputValidator((data: { productTypeId: string }) => data)
	.handler(async ({ data }): Promise<void> => {
		await apiFetch<void>(`${apiUrl}/${data.productTypeId}/retire`, {
			method: "PATCH",
		});
	});
