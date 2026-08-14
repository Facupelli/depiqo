import type {
	GetRentableItemsQueryDto,
	GetRentableItemsResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { productKeys } from "../products.queries";
import { getProducts } from "./get-products.api";

export type ProductListQueryOverrides<TData = GetRentableItemsResponseDto> =
	Omit<
		UseQueryOptions<GetRentableItemsResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

export const productListQueries = {
	list: <TData = GetRentableItemsResponseDto>(
		query?: GetRentableItemsQueryDto,
		overrides?: ProductListQueryOverrides<TData>,
	) =>
		queryOptions<GetRentableItemsResponseDto, ProblemDetailsError, TData>({
			queryKey: productKeys.list(query),
			queryFn: () => getProducts(query),
			...overrides,
		}),
};

export function useProducts<TData = GetRentableItemsResponseDto>(
	query?: GetRentableItemsQueryDto,
	overrides?: ProductListQueryOverrides<TData>,
) {
	return useQuery(productListQueries.list(query, overrides));
}
