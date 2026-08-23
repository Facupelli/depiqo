import {
	RetireAssetParamsSchema,
	type RetireAssetResponseDto,
	RetireAssetResponseSchema,
	retireAssetContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type RetireAssetVariables = {
	assetId: string;
};

export async function retireAsset({
	assetId,
}: RetireAssetVariables): Promise<RetireAssetResponseDto> {
	const parsedParams = RetireAssetParamsSchema.parse({ assetId });
	const path = retireAssetContract.path.replace(
		":assetId",
		encodeURIComponent(parsedParams.assetId),
	);

	const response = await apiFetch(path, {
		method: retireAssetContract.method,
	});

	return RetireAssetResponseSchema.parse(response);
}
