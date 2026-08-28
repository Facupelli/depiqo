import { queryOptions, useQuery } from "@tanstack/react-query";
import { getStorefrontCombosFn } from "./rental-offers/get-storefront-combos/get-storefront-combos.functions";
import type { GetStorefrontCombosInputDto } from "./rental-offers/get-storefront-combos/get-storefront-combos.schema";

export const storefrontCombosKeys = {
	all: () => ["storefront", "catalog", "combos"] as const,
	lists: () => [...storefrontCombosKeys.all(), "list"] as const,
	list: (input: GetStorefrontCombosInputDto) =>
		[...storefrontCombosKeys.lists(), input] as const,
};

export const storefrontCombosQueries = {
	list: (input: GetStorefrontCombosInputDto) =>
		queryOptions({
			queryKey: storefrontCombosKeys.list(input),
			queryFn: () => getStorefrontCombosFn({ data: input }),
		}),
};

export function useStorefrontCombos(input: GetStorefrontCombosInputDto) {
	const query = useQuery(storefrontCombosQueries.list(input));
	const hasData = query.data !== undefined;

	return {
		data: query.data,
		isInitialPending: query.isPending && !hasData,
		isFetching: query.isFetching,
		isInitialError: query.isError && !hasData,
		isFailedRefresh: query.isRefetchError && hasData,
		refetch: query.refetch,
	};
}
