import {
	type CreateRentalOfferWithPricingBodyDto,
	CreateRentalOfferWithPricingBodySchema,
	type CreateRentalOfferWithPricingResponseDto,
	CreateRentalOfferWithPricingResponseSchema,
	createRentalOfferWithPricingContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function createRentalOfferWithPricing(
	body: CreateRentalOfferWithPricingBodyDto,
): Promise<CreateRentalOfferWithPricingResponseDto> {
	const parsedBody = CreateRentalOfferWithPricingBodySchema.parse(body);

	const response = await apiFetch(createRentalOfferWithPricingContract.path, {
		method: createRentalOfferWithPricingContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return CreateRentalOfferWithPricingResponseSchema.parse(response);
}
