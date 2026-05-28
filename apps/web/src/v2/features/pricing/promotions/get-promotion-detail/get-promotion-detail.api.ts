import {
	type GetPromotionDetailParamsDto,
	GetPromotionDetailParamsSchema,
	type GetPromotionDetailResponseDto,
	GetPromotionDetailResponseSchema,
	getPromotionDetailContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function getPromotionDetail(
	params: GetPromotionDetailParamsDto,
): Promise<GetPromotionDetailResponseDto> {
	const parsedParams = GetPromotionDetailParamsSchema.parse(params);
	const path = getPromotionDetailContract.path.replace(
		":promotionId",
		parsedParams.promotionId,
	);

	const response = await apiFetch(path, {
		method: getPromotionDetailContract.method,
	});

	return GetPromotionDetailResponseSchema.parse(response);
}
