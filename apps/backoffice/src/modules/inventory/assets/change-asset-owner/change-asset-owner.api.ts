import {
	type ChangeAssetOwnerBodyDto,
	ChangeAssetOwnerBodySchema,
	ChangeAssetOwnerParamsSchema,
	type ChangeAssetOwnerResponseDto,
	ChangeAssetOwnerResponseSchema,
	changeAssetOwnerContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type ChangeAssetOwnerVariables = {
	assetId: string;
	body: ChangeAssetOwnerBodyDto;
};

export async function changeAssetOwner({
	assetId,
	body,
}: ChangeAssetOwnerVariables): Promise<ChangeAssetOwnerResponseDto> {
	const parsedParams = ChangeAssetOwnerParamsSchema.parse({ assetId });
	const parsedBody = ChangeAssetOwnerBodySchema.parse(body);
	const path = changeAssetOwnerContract.path.replace(
		":assetId",
		encodeURIComponent(parsedParams.assetId),
	);

	const response = await apiFetch(path, {
		method: changeAssetOwnerContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return ChangeAssetOwnerResponseSchema.parse(response);
}
