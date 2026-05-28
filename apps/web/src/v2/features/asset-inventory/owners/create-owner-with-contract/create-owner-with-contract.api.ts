import {
	type CreateOwnerWithContractBodyDto,
	CreateOwnerWithContractBodySchema,
	type CreateOwnerWithContractResponseDto,
	CreateOwnerWithContractResponseSchema,
	createOwnerWithContractContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type CreateOwnerWithContractVariables = {
	body: CreateOwnerWithContractBodyDto;
};

export async function createOwnerWithContract({
	body,
}: CreateOwnerWithContractVariables): Promise<CreateOwnerWithContractResponseDto> {
	const parsedBody = CreateOwnerWithContractBodySchema.parse(body);

	const response = await apiFetch(createOwnerWithContractContract.path, {
		method: createOwnerWithContractContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return CreateOwnerWithContractResponseSchema.parse(response);
}
