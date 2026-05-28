import {
	type BundleListResponseDto,
	type CalculateCartPricesRequest,
	type CartPriceResult,
	calculateCartPricesRequestSchema,
	type GetCombosParams,
	type GetNewArrivalsParams,
	type GetRentalProductTypesQuery,
	getBundleParamsSchema,
	getNewArrivalsParamsSchema,
	getRentalProductQuerySchema,
	type NewArrivalListResponseDto,
	type PaginatedDto,
	type RentalProductResponse,
} from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import { portalTenantMiddleware } from "@/features/tenant-context/portal-tenant.middleware";
import {
	storefrontApiFetch,
	storefrontApiFetchPaginated,
} from "@/lib/storefront-api";

const apiUrl = "/rental";

export interface GetProductDetailParams {
	productId: string;
}

export const getRentalProducts = createServerFn({ method: "GET" })
	.middleware([portalTenantMiddleware])
	.inputValidator((data: GetRentalProductTypesQuery) =>
		getRentalProductQuerySchema.parse(data),
	)
	.handler(
		async ({ context, data }): Promise<PaginatedDto<RentalProductResponse>> => {
			const result = await storefrontApiFetchPaginated<RentalProductResponse>(
				context.tenantId,
				`${apiUrl}/product-types`,
				{
					method: "GET",
					params: data,
				},
			);

			return result;
		},
	);

export const getNewArrivals = createServerFn({ method: "GET" })
	.middleware([portalTenantMiddleware])
	.inputValidator((data: GetNewArrivalsParams) =>
		getNewArrivalsParamsSchema.parse(data),
	)
	.handler(async ({ context, data }): Promise<NewArrivalListResponseDto> => {
		return await storefrontApiFetch<NewArrivalListResponseDto>(
			context.tenantId,
			`${apiUrl}/new-arrivals`,
			{
				method: "GET",
				params: data,
			},
		);
	});

export const getRentalBundles = createServerFn({ method: "GET" })
	.middleware([portalTenantMiddleware])
	.inputValidator((data: GetCombosParams) => getBundleParamsSchema.parse(data))
	.handler(async ({ context, data }): Promise<BundleListResponseDto> => {
		return await storefrontApiFetch<BundleListResponseDto>(
			context.tenantId,
			`${apiUrl}/bundles`,
			{
				method: "GET",
				params: data,
			},
		);
	});

export const getCartPricePreview = createServerFn({ method: "POST" })
	.middleware([portalTenantMiddleware])
	.inputValidator((data: CalculateCartPricesRequest) =>
		calculateCartPricesRequestSchema.parse(data),
	)
	.handler(async ({ context, data }): Promise<CartPriceResult> => {
		const result = await storefrontApiFetch<CartPriceResult>(
			context.tenantId,
			"/pricing/cart/preview",
			{
				method: "POST",
				body: data,
			},
		);

		return result;
	});
