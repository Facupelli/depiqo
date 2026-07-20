import type { GetStorefrontCategoriesResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getStorefrontCategoriesFn } from "./get-storefront-categories/get-storefront-categories.functions";

export type StorefrontCategoriesQueryOverrides<
	TData = GetStorefrontCategoriesResponseDto,
> = Omit<
	UseQueryOptions<
		GetStorefrontCategoriesResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const storefrontCategoryKeys = {
	all: () => ["storefront", "catalog", "categories"] as const,
};

export const storefrontCategoryQueries = {
	list: <TData = GetStorefrontCategoriesResponseDto>(
		overrides?: StorefrontCategoriesQueryOverrides<TData>,
	) =>
		queryOptions<
			GetStorefrontCategoriesResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: storefrontCategoryKeys.all(),
			queryFn: () => getStorefrontCategoriesFn(),
			...overrides,
		}),
};

export function useStorefrontCategories<
	TData = GetStorefrontCategoriesResponseDto,
>(overrides?: StorefrontCategoriesQueryOverrides<TData>) {
	return useQuery(storefrontCategoryQueries.list(overrides));
}
