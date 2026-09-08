import {
	DeactivateAssetParamsSchema,
	type DeactivateAssetResponseDto,
	DeactivateAssetResponseSchema,
	deactivateAssetContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type DeactivateAssetVariables = { assetId: string };

export async function deactivateAsset({
	assetId,
}: DeactivateAssetVariables): Promise<DeactivateAssetResponseDto> {
	const params = DeactivateAssetParamsSchema.parse({ assetId });
	const path = deactivateAssetContract.path.replace(
		":assetId",
		encodeURIComponent(params.assetId),
	);
	const response = await apiFetch(path, {
		method: deactivateAssetContract.method,
	});
	return DeactivateAssetResponseSchema.parse(response);
}
