import {
	type GetRentableItemSummariesResponseDto,
	GetRentableItemSummariesResponseSchema,
	getRentableItemSummariesContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getRentableItemSummaries(
	ids: string[],
): Promise<GetRentableItemSummariesResponseDto> {
	const parsedQuery = getRentableItemSummariesContract.query.parse({
		ids: ids.join(","),
	});
	const searchParams = new URLSearchParams({ ids: parsedQuery.ids.join(",") });
	const response = await apiFetch(
		`${getRentableItemSummariesContract.path}?${searchParams.toString()}`,
		{ method: getRentableItemSummariesContract.method },
	);

	return GetRentableItemSummariesResponseSchema.parse(response);
}
