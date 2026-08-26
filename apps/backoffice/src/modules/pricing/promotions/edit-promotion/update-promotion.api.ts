import {
	type UpdatePromotionBodyDto,
	UpdatePromotionBodySchema,
	type UpdatePromotionParamsDto,
	UpdatePromotionParamsSchema,
	type UpdatePromotionResponseDto,
	UpdatePromotionResponseSchema,
	updatePromotionContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type UpdatePromotionVariables = {
	params: UpdatePromotionParamsDto;
	body: UpdatePromotionBodyDto;
};

export async function updatePromotion({
	params,
	body,
}: UpdatePromotionVariables): Promise<UpdatePromotionResponseDto> {
	const parsedParams = UpdatePromotionParamsSchema.parse(params);
	const parsedBody = UpdatePromotionBodySchema.parse(body);
	const path = updatePromotionContract.path.replace(
		":promotionId",
		parsedParams.promotionId,
	);

	const response = await apiFetch(path, {
		method: updatePromotionContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return UpdatePromotionResponseSchema.parse(response);
}
