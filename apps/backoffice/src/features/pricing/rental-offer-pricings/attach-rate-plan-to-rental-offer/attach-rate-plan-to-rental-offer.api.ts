import {
	type AttachRatePlanToRentalOfferBodyDto,
	AttachRatePlanToRentalOfferBodySchema,
	type AttachRatePlanToRentalOfferResponseDto,
	AttachRatePlanToRentalOfferResponseSchema,
	attachRatePlanToRentalOfferContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type AttachRatePlanToRentalOfferVariables = {
	body: AttachRatePlanToRentalOfferBodyDto;
};

export async function attachRatePlanToRentalOffer({
	body,
}: AttachRatePlanToRentalOfferVariables): Promise<AttachRatePlanToRentalOfferResponseDto> {
	const parsedBody = AttachRatePlanToRentalOfferBodySchema.parse(body);

	const response = await apiFetch(attachRatePlanToRentalOfferContract.path, {
		method: attachRatePlanToRentalOfferContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return AttachRatePlanToRentalOfferResponseSchema.parse(response);
}
