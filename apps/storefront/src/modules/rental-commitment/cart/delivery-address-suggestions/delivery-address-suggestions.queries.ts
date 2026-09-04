import type { SearchStorefrontDeliveryAddressSuggestionsResponseDto } from "@repo/api-contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { searchDeliveryAddressSuggestionsFn } from "./delivery-address-suggestions.functions";

export const deliveryAddressSuggestionKeys = {
	all: () => ["storefront", "delivery", "address-suggestions"] as const,
	search: (text: string) =>
		[...deliveryAddressSuggestionKeys.all(), text] as const,
};

export const deliveryAddressSuggestionQueries = {
	search: (text: string) =>
		queryOptions<SearchStorefrontDeliveryAddressSuggestionsResponseDto>({
			queryKey: deliveryAddressSuggestionKeys.search(text),
			queryFn: () => searchDeliveryAddressSuggestionsFn({ data: { text } }),
			enabled: text.length >= 3,
		}),
};

export function useDeliveryAddressSuggestions(text: string) {
	return useQuery(deliveryAddressSuggestionQueries.search(text));
}
