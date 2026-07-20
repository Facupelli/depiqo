import {
	type CreateConfirmedRentalBodyDto,
	CreateConfirmedRentalBodySchema,
	type CreateConfirmedRentalResponseDto,
	CreateConfirmedRentalResponseSchema,
	createConfirmedRentalContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type CreateConfirmedRentalVariables = {
	body: CreateConfirmedRentalBodyDto;
};

export async function createConfirmedRental({
	body,
}: CreateConfirmedRentalVariables): Promise<CreateConfirmedRentalResponseDto> {
	const parsedBody = CreateConfirmedRentalBodySchema.parse(body);

	const response = await apiFetch(createConfirmedRentalContract.path, {
		method: createConfirmedRentalContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return CreateConfirmedRentalResponseSchema.parse(response);
}
