import {
	type UpdateAssetBodyDto,
	UpdateAssetBodySchema,
	UpdateAssetParamsSchema,
	type UpdateAssetResponseDto,
	UpdateAssetResponseSchema,
	updateAssetContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type UpdateAssetVariables = {
	assetId: string;
	body: UpdateAssetBodyDto;
};

export async function updateAsset({
	assetId,
	body,
}: UpdateAssetVariables): Promise<UpdateAssetResponseDto> {
	const parsedParams = UpdateAssetParamsSchema.parse({ assetId });
	const parsedBody = UpdateAssetBodySchema.parse(body);
	const path = updateAssetContract.path.replace(
		":assetId",
		encodeURIComponent(parsedParams.assetId),
	);

	const response = await apiFetch(path, {
		method: updateAssetContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return UpdateAssetResponseSchema.parse(response);
}
