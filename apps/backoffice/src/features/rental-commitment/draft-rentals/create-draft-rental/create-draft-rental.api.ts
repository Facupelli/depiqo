import {
	type CreateDraftRentalBodyDto,
	CreateDraftRentalBodySchema,
	type CreateDraftRentalResponseDto,
	CreateDraftRentalResponseSchema,
	createDraftRentalContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type CreateDraftRentalVariables = {
	body: CreateDraftRentalBodyDto;
};

export async function createDraftRental({
	body,
}: CreateDraftRentalVariables): Promise<CreateDraftRentalResponseDto> {
	const parsedBody = CreateDraftRentalBodySchema.parse(body);

	const response = await apiFetch(createDraftRentalContract.path, {
		method: createDraftRentalContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return CreateDraftRentalResponseSchema.parse(response);
}
