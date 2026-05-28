import {
	type GetRentalOffersPricingQueryDto,
	GetRentalOffersPricingQuerySchema,
	type GetRentalOffersPricingResponseDto,
	GetRentalOffersPricingResponseSchema,
	getRentalOffersPricingContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

function buildGetRentalOffersPricingPath(
	query: GetRentalOffersPricingQueryDto,
) {
	const parsedQuery = GetRentalOffersPricingQuerySchema.parse(query);
	const searchParams = new URLSearchParams();

	for (const rentalOfferId of parsedQuery.rentalOfferIds) {
		searchParams.append("rentalOfferIds", rentalOfferId);
	}

	return `${getRentalOffersPricingContract.path}?${searchParams.toString()}`;
}

export async function getRentalOffersPricing(
	query: GetRentalOffersPricingQueryDto,
): Promise<GetRentalOffersPricingResponseDto> {
	const response = await apiFetch(buildGetRentalOffersPricingPath(query), {
		method: getRentalOffersPricingContract.method,
	});

	return GetRentalOffersPricingResponseSchema.parse(response);
}
