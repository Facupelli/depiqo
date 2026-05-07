import {
	keepPreviousData,
	queryOptions,
	useQuery,
	useSuspenseQuery,
	type UseQueryOptions,
	type UseSuspenseQueryOptions,
} from "@tanstack/react-query";
import {
	getAvailableProductTypeAccessories,
	getProductTypeAccessoryLinks,
	getProductDetail,
	getProductTimeline,
	getProducts,
} from "./products.api";
import type {
	GetAvailableAccessoriesQuery,
	GetProductTimelineQuery,
	GetProductTypesQuery,
	PaginatedDto,
	ProductTypeAccessoryLinkResponse,
	ProductTimelineResponse,
	ProductTypeResponse,
} from "@repo/schemas";
import type { ProblemDetailsError } from "@/shared/errors";

type PaginatedProducts = PaginatedDto<ProductTypeResponse>;

export type ProductsQueryOverrides<TData = PaginatedProducts> = Omit<
	UseQueryOptions<PaginatedProducts, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type ProductDetailQueryOverrides<TData = ProductTypeResponse> = Omit<
	UseSuspenseQueryOptions<ProductTypeResponse, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type ProductTimelineQueryOverrides<
	TData = ProductTimelineResponse,
> = Omit<
	UseQueryOptions<ProductTimelineResponse, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type ProductAccessoryLinksQueryOverrides<
	TData = ProductTypeAccessoryLinkResponse[],
> = Omit<
	UseQueryOptions<ProductTypeAccessoryLinkResponse[], ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type AvailableAccessoriesQueryOverrides<TData = PaginatedProducts> = Omit<
	UseQueryOptions<PaginatedProducts, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

// -------------------------------------------------------
// Query Key Factory
// -------------------------------------------------------

export const productKeys = {
	all: () => ["products"] as const,
	lists: () => [...productKeys.all(), "list"] as const,
	list: (params: GetProductTypesQuery) =>
		[...productKeys.lists(), params] as const,
	timelines: () => [...productKeys.all(), "timeline"] as const,
	timeline: (params: GetProductTimelineQuery) =>
		[...productKeys.timelines(), params] as const,
	details: () => [...productKeys.all(), "detail"] as const,
	detail: (id: string) => [...productKeys.details(), id] as const,
	accessoryLinks: (id: string) =>
		[...productKeys.detail(id), "accessory-links"] as const,
	availableAccessories: (id: string, params: GetAvailableAccessoriesQuery) =>
		[...productKeys.detail(id), "available-accessories", params] as const,
};

// -------------------------------------------------------
// Query Options
// -------------------------------------------------------

export const productQueries = {
	list: <TData = PaginatedProducts>(
		params: GetProductTypesQuery = {},
		overrides?: ProductsQueryOverrides<TData>,
	) =>
		queryOptions<PaginatedProducts, ProblemDetailsError, TData>({
			queryKey: productKeys.list(params),
			queryFn: () => getProducts({ data: params }),
			...overrides,
		}),

	detail: <TData = ProductTypeResponse>(
		id: string,
		overrides?: ProductDetailQueryOverrides<TData>,
	) =>
		queryOptions<ProductTypeResponse, ProblemDetailsError, TData>({
			queryKey: productKeys.detail(id),
			queryFn: () => getProductDetail({ data: { productId: id } }),
			...overrides,
		}),

	accessoryLinks: <TData = ProductTypeAccessoryLinkResponse[]>(
		id: string,
		overrides?: ProductAccessoryLinksQueryOverrides<TData>,
	) =>
		queryOptions<ProductTypeAccessoryLinkResponse[], ProblemDetailsError, TData>({
			queryKey: productKeys.accessoryLinks(id),
			queryFn: () =>
				getProductTypeAccessoryLinks({ data: { productTypeId: id } }),
			...overrides,
		}),

	availableAccessories: <TData = PaginatedProducts>(
		id: string,
		params: GetAvailableAccessoriesQuery = {},
		overrides?: AvailableAccessoriesQueryOverrides<TData>,
	) =>
		queryOptions<PaginatedProducts, ProblemDetailsError, TData>({
			queryKey: productKeys.availableAccessories(id, params),
			queryFn: () =>
				getAvailableProductTypeAccessories({
					data: { productTypeId: id, params },
				}),
			...overrides,
		}),

	timeline: <TData = ProductTimelineResponse>(
		params: GetProductTimelineQuery,
		overrides?: ProductTimelineQueryOverrides<TData>,
	) =>
		queryOptions<ProductTimelineResponse, ProblemDetailsError, TData>({
			queryKey: productKeys.timeline(params),
			queryFn: () => getProductTimeline({ data: params }),
			...overrides,
		}),
};

// -------------------------------------------------------
// Hooks
// -------------------------------------------------------

export function useProducts<TData = PaginatedProducts>(
	params: GetProductTypesQuery = {},
	overrides?: ProductsQueryOverrides<TData>,
) {
	return useQuery({
		...productQueries.list(params, overrides),
		placeholderData: keepPreviousData,
	});
}

export function useProductDetail<TData = ProductTypeResponse>(
	id: string,
	overrides?: ProductDetailQueryOverrides<TData>,
) {
	return useSuspenseQuery(productQueries.detail(id, overrides));
}

export function useProductTimeline<TData = ProductTimelineResponse>(
	params: GetProductTimelineQuery,
	overrides?: ProductTimelineQueryOverrides<TData>,
) {
	return useQuery(productQueries.timeline(params, overrides));
}

export function useProductAccessoryLinks<
	TData = ProductTypeAccessoryLinkResponse[],
>(id: string, overrides?: ProductAccessoryLinksQueryOverrides<TData>) {
	return useQuery(productQueries.accessoryLinks(id, overrides));
}

export function useAvailableProductTypeAccessories<TData = PaginatedProducts>(
	id: string,
	params: GetAvailableAccessoriesQuery = {},
	overrides?: AvailableAccessoriesQueryOverrides<TData>,
) {
	return useQuery(productQueries.availableAccessories(id, params, overrides));
}
