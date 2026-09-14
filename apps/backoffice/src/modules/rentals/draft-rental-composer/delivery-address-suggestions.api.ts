import {
	type SearchBranchAddressSuggestionsResponseDto,
	SearchBranchAddressSuggestionsResponseSchema,
	searchBranchAddressSuggestionsContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function searchDeliveryAddressSuggestions(
	text: string,
): Promise<SearchBranchAddressSuggestionsResponseDto> {
	const searchParams = new URLSearchParams({ text });
	const response = await apiFetch(
		`${searchBranchAddressSuggestionsContract.path}?${searchParams.toString()}`,
		{ method: searchBranchAddressSuggestionsContract.method },
	);

	return SearchBranchAddressSuggestionsResponseSchema.parse(response);
}
