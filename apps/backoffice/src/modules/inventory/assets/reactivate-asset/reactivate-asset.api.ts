import {
	ReactivateAssetParamsSchema,
	type ReactivateAssetResponseDto,
	ReactivateAssetResponseSchema,
	reactivateAssetContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type ReactivateAssetVariables = { assetId: string };

export async function reactivateAsset({
	assetId,
}: ReactivateAssetVariables): Promise<ReactivateAssetResponseDto> {
	const params = ReactivateAssetParamsSchema.parse({ assetId });
	const path = reactivateAssetContract.path.replace(
		":assetId",
		encodeURIComponent(params.assetId),
	);
	const response = await apiFetch(path, {
		method: reactivateAssetContract.method,
	});
	return ReactivateAssetResponseSchema.parse(response);
}
