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

export function getProductListInputFromQueryKey(
	queryKey: readonly unknown[],
): GetRentableItemsQueryDto | undefined {
	const listKeyPrefix = productKeys.lists();
	if (
		queryKey.length !== listKeyPrefix.length + 1 ||
		!listKeyPrefix.every((value, index) => queryKey[index] === value)
	) {
		return undefined;
	}

	const input = queryKey.at(-1);
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		return undefined;
	}

	return input as GetRentableItemsQueryDto;
}

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
