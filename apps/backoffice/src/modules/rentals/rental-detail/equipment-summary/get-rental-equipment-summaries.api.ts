import {
	type GetAssetSummariesResponseDto,
	GetAssetSummariesResponseSchema,
	getAssetSummariesContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getAssetSummaries(
	ids: string[],
): Promise<GetAssetSummariesResponseDto> {
	const parsedQuery = getAssetSummariesContract.query.parse({
		ids: ids.join(","),
	});
	const searchParams = new URLSearchParams({ ids: parsedQuery.ids.join(",") });
	const response = await apiFetch(
		`${getAssetSummariesContract.path}?${searchParams.toString()}`,
		{ method: getAssetSummariesContract.method },
	);

	return GetAssetSummariesResponseSchema.parse(response);
}
