import {
	CalculateDraftRentalPriceBodySchema,
	type CalculateDraftRentalPriceResponseDto,
	CalculateDraftRentalPriceResponseSchema,
	calculateDraftRentalPriceContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type CalculateDraftRentalPriceVariables = {
	body: unknown;
	headers?: HeadersInit;
};

export async function calculateDraftRentalPrice({
	body,
	headers,
}: CalculateDraftRentalPriceVariables): Promise<CalculateDraftRentalPriceResponseDto> {
	const parsedBody = CalculateDraftRentalPriceBodySchema.parse(body);

	const requestHeaders = new Headers(headers);
	requestHeaders.set("Content-Type", "application/json");

	const response = await apiFetch(calculateDraftRentalPriceContract.path, {
		method: calculateDraftRentalPriceContract.method,
		headers: requestHeaders,
		body: JSON.stringify(parsedBody),
	});

	return CalculateDraftRentalPriceResponseSchema.parse(response);
}
