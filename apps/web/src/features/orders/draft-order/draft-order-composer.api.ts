import type {
	BundleListResponseDto,
	CalculateCartPricesRequest,
	CartPriceResult,
	GetCombosParams,
	GetRentalProductTypesQuery,
	PaginatedDto,
	RentalProductResponse,
} from "@repo/schemas";
import {
	calculateCartPricesRequestSchema,
	getBundleParamsSchema,
	getRentalProductQuerySchema,
} from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	storefrontApiFetch,
	storefrontApiFetchPaginated,
} from "@/lib/storefront-api";

const adminDraftOrderRentalProductsInputSchema = z.object({
	tenantId: z.uuid(),
	query: getRentalProductQuerySchema,
});

const adminDraftOrderRentalBundlesInputSchema = z.object({
	tenantId: z.uuid(),
	query: getBundleParamsSchema,
});

const adminDraftOrderCartPreviewInputSchema = z.object({
	tenantId: z.uuid(),
	request: calculateCartPricesRequestSchema,
});

export const getAdminDraftOrderRentalProducts = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: { tenantId: string; query: GetRentalProductTypesQuery }) =>
			adminDraftOrderRentalProductsInputSchema.parse(data),
	)
	.handler(async ({ data }): Promise<PaginatedDto<RentalProductResponse>> => {
		return storefrontApiFetchPaginated<RentalProductResponse>(
			data.tenantId,
			"/rental/product-types",
			{
				method: "GET",
				params: data.query,
			},
		);
	});

export const getAdminDraftOrderRentalBundles = createServerFn({
	method: "POST",
})
	.inputValidator((data: { tenantId: string; query: GetCombosParams }) =>
		adminDraftOrderRentalBundlesInputSchema.parse(data),
	)
	.handler(async ({ data }): Promise<BundleListResponseDto> => {
		return storefrontApiFetch<BundleListResponseDto>(
			data.tenantId,
			"/rental/bundles",
			{
				method: "GET",
				params: data.query,
			},
		);
	});

export const getAdminDraftOrderCartPricePreview = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: { tenantId: string; request: CalculateCartPricesRequest }) =>
			adminDraftOrderCartPreviewInputSchema.parse(data),
	)
	.handler(async ({ data }): Promise<CartPriceResult> => {
		return storefrontApiFetch<CartPriceResult>(
			data.tenantId,
			"/pricing/cart/preview",
			{
				method: "POST",
				body: data.request,
			},
		);
	});
