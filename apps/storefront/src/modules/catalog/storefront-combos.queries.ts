import {
	keepPreviousData,
	queryOptions,
	useSuspenseQuery,
} from "@tanstack/react-query";
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
			placeholderData: keepPreviousData,
		}),
};

export function useStorefrontCombos(input: GetStorefrontCombosInputDto) {
	return useSuspenseQuery(storefrontCombosQueries.list(input));
}
