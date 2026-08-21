import {
	type UpdateRentalOfferVisibilityAndRentabilityBodyDto,
	UpdateRentalOfferVisibilityAndRentabilityBodySchema,
	UpdateRentalOfferVisibilityAndRentabilityParamsSchema,
	type UpdateRentalOfferVisibilityAndRentabilityResponseDto,
	UpdateRentalOfferVisibilityAndRentabilityResponseSchema,
	updateRentalOfferVisibilityAndRentabilityContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type UpdateBranchAvailabilityVariables = {
	rentalOfferId: string;
	body: UpdateRentalOfferVisibilityAndRentabilityBodyDto;
};

export async function updateBranchAvailability({
	rentalOfferId,
	body,
}: UpdateBranchAvailabilityVariables): Promise<UpdateRentalOfferVisibilityAndRentabilityResponseDto> {
	const parsedParams =
		UpdateRentalOfferVisibilityAndRentabilityParamsSchema.parse({
			rentalOfferId,
		});
	const parsedBody =
		UpdateRentalOfferVisibilityAndRentabilityBodySchema.parse(body);
	const path = updateRentalOfferVisibilityAndRentabilityContract.path.replace(
		":rentalOfferId",
		encodeURIComponent(parsedParams.rentalOfferId),
	);

	const response = await apiFetch(path, {
		method: updateRentalOfferVisibilityAndRentabilityContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return UpdateRentalOfferVisibilityAndRentabilityResponseSchema.parse(
		response,
	);
}
