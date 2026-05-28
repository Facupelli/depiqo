import {
	type CreatePromotionBodyDto,
	CreatePromotionBodySchema,
	type CreatePromotionResponseDto,
	CreatePromotionResponseSchema,
	createPromotionContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type CreatePromotionVariables = {
	body: CreatePromotionBodyDto;
};

export async function createPromotion({
	body,
}: CreatePromotionVariables): Promise<CreatePromotionResponseDto> {
	const parsedBody = CreatePromotionBodySchema.parse(body);

	const response = await apiFetch(createPromotionContract.path, {
		method: createPromotionContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return CreatePromotionResponseSchema.parse(response);
}
