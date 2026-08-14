import type { GetCategoriesResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getCategories } from "./get-categories/get-categories.api";

export type CategoriesQueryOverrides<TData = GetCategoriesResponseDto> = Omit<
	UseQueryOptions<GetCategoriesResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const categoryKeys = {
	all: () => ["v2", "tenant-management", "categories"] as const,
	lists: () => [...categoryKeys.all(), "list"] as const,
	list: () => [...categoryKeys.lists()] as const,
};

export const categoryQueries = {
	list: <TData = GetCategoriesResponseDto>(
		overrides?: CategoriesQueryOverrides<TData>,
	) =>
		queryOptions<GetCategoriesResponseDto, ProblemDetailsError, TData>({
			queryKey: categoryKeys.list(),
			queryFn: () => getCategories(),
			...overrides,
		}),
};

export function useCategories<TData = GetCategoriesResponseDto>(
	overrides?: CategoriesQueryOverrides<TData>,
) {
	return useQuery(categoryQueries.list(overrides));
}
