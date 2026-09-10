import {
	type CreateIndividualRentalBodyDto,
	CreateIndividualRentalBodySchema,
	type CreateIndividualRentalResponseDto,
	CreateIndividualRentalResponseSchema,
	createIndividualRentalContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function createIndividualRental(
	body: CreateIndividualRentalBodyDto,
): Promise<CreateIndividualRentalResponseDto> {
	const parsedBody = CreateIndividualRentalBodySchema.parse(body);
	const response = await apiFetch(createIndividualRentalContract.path, {
		method: createIndividualRentalContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return CreateIndividualRentalResponseSchema.parse(response);
}
