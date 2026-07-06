import {
	type CreateRatePlanAndAttachToRentalOfferBodyDto,
	CreateRatePlanAndAttachToRentalOfferBodySchema,
	type CreateRatePlanAndAttachToRentalOfferResponseDto,
	CreateRatePlanAndAttachToRentalOfferResponseSchema,
	createRatePlanAndAttachToRentalOfferContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type CreateRatePlanAndAttachToRentalOfferVariables = {
	body: CreateRatePlanAndAttachToRentalOfferBodyDto;
};

export async function createRatePlanAndAttachToRentalOffer({
	body,
}: CreateRatePlanAndAttachToRentalOfferVariables): Promise<CreateRatePlanAndAttachToRentalOfferResponseDto> {
	const parsedBody = CreateRatePlanAndAttachToRentalOfferBodySchema.parse(body);

	const response = await apiFetch(
		createRatePlanAndAttachToRentalOfferContract.path,
		{
			method: createRatePlanAndAttachToRentalOfferContract.method,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(parsedBody),
		},
	);

	return CreateRatePlanAndAttachToRentalOfferResponseSchema.parse(response);
}
