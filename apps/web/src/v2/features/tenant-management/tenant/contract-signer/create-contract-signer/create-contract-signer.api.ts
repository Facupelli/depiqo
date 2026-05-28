import {
	type CreateContractSignerBodyDto,
	CreateContractSignerBodySchema,
	type CreateContractSignerResponseDto,
	CreateContractSignerResponseSchema,
	createContractSignerContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type CreateContractSignerVariables = CreateContractSignerBodyDto;

export async function createContractSigner(
	body: CreateContractSignerVariables,
): Promise<CreateContractSignerResponseDto> {
	const parsedBody = CreateContractSignerBodySchema.parse(body);

	const response = await apiFetch(createContractSignerContract.path, {
		method: createContractSignerContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return CreateContractSignerResponseSchema.parse(response);
}
