import {
	type CreateDraftRentalBodyDto,
	CreateDraftRentalBodySchema,
	CreateDraftRentalHeadersSchema,
	type CreateDraftRentalResponseDto,
	CreateDraftRentalResponseSchema,
	createDraftRentalContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type CreateDraftRentalVariables = {
	body: CreateDraftRentalBodyDto;
	idempotencyKey: string;
};

export async function createDraftRental({
	body,
	idempotencyKey,
}: CreateDraftRentalVariables): Promise<CreateDraftRentalResponseDto> {
	const parsedBody = CreateDraftRentalBodySchema.parse(body);
	const headers = CreateDraftRentalHeadersSchema.parse({
		"idempotency-key": idempotencyKey,
	});

	const response = await apiFetch(createDraftRentalContract.path, {
		method: createDraftRentalContract.method,
		headers: {
			...headers,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return CreateDraftRentalResponseSchema.parse(response);
}
