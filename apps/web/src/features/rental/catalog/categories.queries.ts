import type { ProductCategoryListResponse } from "@repo/schemas";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import { usePortalTenantId } from "@/features/tenant-context/use-portal-tenant-id";

import type { ProblemDetailsError } from "@/shared/errors";

import { getRentalCategories } from "./categories.api";

export const rentalCategoryKeys = {
	all: (tenantId: string) => ["rental-categories", tenantId] as const,
	lists: (tenantId: string) =>
		[...rentalCategoryKeys.all(tenantId), "list"] as const,
};

export const rentalCategoryQueries = {
	list: (tenantId: string) =>
		queryOptions<ProductCategoryListResponse, ProblemDetailsError>({
			queryKey: rentalCategoryKeys.lists(tenantId),
			queryFn: () => getRentalCategories(),
		}),
};

type RentalCategoryQueryOptions<TData = ProductCategoryListResponse> = Omit<
	UseQueryOptions<ProductCategoryListResponse, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export function useRentalCategories<TData = ProductCategoryListResponse>(
	options?: RentalCategoryQueryOptions<TData>,
) {
	const tenantId = usePortalTenantId();
	const { queryKey, queryFn } = rentalCategoryQueries.list(tenantId);

	return useQuery({
		...options,
		queryKey,
		queryFn,
	});
}
