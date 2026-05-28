import {
	type GetRentalOfferAvailabilityRequestDto,
	GetRentalOfferAvailabilityRequestSchema,
	type GetRentalOfferAvailabilityResponseDto,
	GetRentalOfferAvailabilityResponseSchema,
	getRentalOfferAvailabilityContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function getRentalOfferAvailability(
	body: GetRentalOfferAvailabilityRequestDto,
): Promise<GetRentalOfferAvailabilityResponseDto> {
	const parsedBody = GetRentalOfferAvailabilityRequestSchema.parse(body);
	const response = await apiFetch(getRentalOfferAvailabilityContract.path, {
		method: getRentalOfferAvailabilityContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return GetRentalOfferAvailabilityResponseSchema.parse(response);
}
