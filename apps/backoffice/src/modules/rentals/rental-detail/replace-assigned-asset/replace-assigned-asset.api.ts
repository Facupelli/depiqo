import {
	type ReplaceConfirmedRentalAssetBodyDto,
	ReplaceConfirmedRentalAssetBodySchema,
	type ReplaceConfirmedRentalAssetParamsDto,
	ReplaceConfirmedRentalAssetParamsSchema,
	type ReplaceConfirmedRentalAssetResponseDto,
	ReplaceConfirmedRentalAssetResponseSchema,
	replaceConfirmedRentalAssetContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type ReplaceAssignedAssetVariables =
	ReplaceConfirmedRentalAssetParamsDto & ReplaceConfirmedRentalAssetBodyDto;

export async function replaceAssignedAsset({
	rentalId,
	...body
}: ReplaceAssignedAssetVariables): Promise<ReplaceConfirmedRentalAssetResponseDto> {
	const params = ReplaceConfirmedRentalAssetParamsSchema.parse({ rentalId });
	const parsedBody = ReplaceConfirmedRentalAssetBodySchema.parse(body);
	const path = replaceConfirmedRentalAssetContract.path.replace(
		":rentalId",
		encodeURIComponent(params.rentalId),
	);
	const response = await apiFetch(path, {
		method: replaceConfirmedRentalAssetContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return ReplaceConfirmedRentalAssetResponseSchema.parse(response);
}
