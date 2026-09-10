import {
	type CreatePricingForRentalOfferBodyDto,
	type CreatePricingForRentalOfferResponseDto,
	CreatePricingForRentalOfferResponseSchema,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function createPricingForRentalOffer(
	body: CreatePricingForRentalOfferBodyDto,
): Promise<CreatePricingForRentalOfferResponseDto> {
	const response = await apiFetch<unknown>("/pricing/rental-offer-pricings", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return CreatePricingForRentalOfferResponseSchema.parse(response);
}
