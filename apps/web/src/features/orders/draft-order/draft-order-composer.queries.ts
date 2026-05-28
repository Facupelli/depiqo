import type {
	BundleListResponseDto,
	GetCombosParams,
	GetRentalProductTypesQuery,
	PaginatedDto,
	RentalProductResponse,
} from "@repo/schemas";
import {
	keepPreviousData,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import { useCurrentTenant } from "@/features/tenant/tenant.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	getAdminDraftOrderRentalBundles,
	getAdminDraftOrderRentalProducts,
} from "./draft-order-composer.api";

type PaginatedRentalProducts = PaginatedDto<RentalProductResponse>;

type DraftOrderRentalProductsQueryOptions<TData = PaginatedRentalProducts> =
	Omit<
		UseQueryOptions<PaginatedRentalProducts, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

type DraftOrderRentalBundlesQueryOptions<TData = BundleListResponseDto> = Omit<
	UseQueryOptions<BundleListResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export function useDraftOrderRentalProducts<TData = PaginatedRentalProducts>(
	params: GetRentalProductTypesQuery,
	options?: DraftOrderRentalProductsQueryOptions<TData>,
) {
	const { data: tenant } = useCurrentTenant();

	return useQuery({
		...options,
		queryKey: ["draft-order", "rental-products", tenant?.id ?? null, params],
		queryFn: () =>
			getAdminDraftOrderRentalProducts({
				data: {
					tenantId: tenant?.id ?? "",
					query: params,
				},
			}),
		placeholderData: keepPreviousData,
		enabled: Boolean(tenant?.id) && (options?.enabled ?? true),
	});
}

export function useDraftOrderRentalBundles<TData = BundleListResponseDto>(
	params: GetCombosParams,
	options?: DraftOrderRentalBundlesQueryOptions<TData>,
) {
	const { data: tenant } = useCurrentTenant();

	return useQuery({
		...options,
		queryKey: ["draft-order", "rental-bundles", tenant?.id ?? null, params],
		queryFn: () =>
			getAdminDraftOrderRentalBundles({
				data: {
					tenantId: tenant?.id ?? "",
					query: params,
				},
			}),
		placeholderData: keepPreviousData,
		enabled: Boolean(tenant?.id) && (options?.enabled ?? true),
	});
}
