import type { SearchBranchAddressSuggestionsResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { searchDeliveryAddressSuggestions } from "./delivery-address-suggestions.api";

type DeliveryAddressSuggestionsQueryOverrides<
	TData = SearchBranchAddressSuggestionsResponseDto,
> = Omit<
	UseQueryOptions<
		SearchBranchAddressSuggestionsResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

const deliveryAddressSuggestionKeys = {
	all: () => ["v2", "rentals", "create-rental", "delivery-address"] as const,
	suggestions: (text: string) =>
		[...deliveryAddressSuggestionKeys.all(), "suggestions", text] as const,
};

function deliveryAddressSuggestionsQueryOptions<
	TData = SearchBranchAddressSuggestionsResponseDto,
>(text: string, overrides?: DeliveryAddressSuggestionsQueryOverrides<TData>) {
	return queryOptions<
		SearchBranchAddressSuggestionsResponseDto,
		ProblemDetailsError,
		TData
	>({
		queryKey: deliveryAddressSuggestionKeys.suggestions(text),
		queryFn: () => searchDeliveryAddressSuggestions(text),
		enabled: text.trim().length >= 3,
		...overrides,
	});
}

export function useDeliveryAddressSuggestions<
	TData = SearchBranchAddressSuggestionsResponseDto,
>(text: string, overrides?: DeliveryAddressSuggestionsQueryOverrides<TData>) {
	return useQuery(deliveryAddressSuggestionsQueryOptions(text, overrides));
}
