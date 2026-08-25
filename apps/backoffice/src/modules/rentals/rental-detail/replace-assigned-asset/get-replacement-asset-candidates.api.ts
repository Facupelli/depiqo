import {
	type GetReplacementAssetCandidatesParamsDto,
	GetReplacementAssetCandidatesParamsSchema,
	type GetReplacementAssetCandidatesResponseDto,
	GetReplacementAssetCandidatesResponseSchema,
	getReplacementAssetCandidatesContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getReplacementAssetCandidates(
	input: GetReplacementAssetCandidatesParamsDto,
): Promise<GetReplacementAssetCandidatesResponseDto> {
	const params = GetReplacementAssetCandidatesParamsSchema.parse(input);
	const path = getReplacementAssetCandidatesContract.path
		.replace(":rentalId", encodeURIComponent(params.rentalId))
		.replace(
			":currentAssignedAssetId",
			encodeURIComponent(params.currentAssignedAssetId),
		);
	const response = await apiFetch(path, {
		method: getReplacementAssetCandidatesContract.method,
	});

	return GetReplacementAssetCandidatesResponseSchema.parse(response);
}
