import {
	type UpdateContractSignerBodyDto,
	UpdateContractSignerBodySchema,
	type UpdateContractSignerResponseDto,
	UpdateContractSignerResponseSchema,
	updateContractSignerContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type UpdateContractSignerVariables = UpdateContractSignerBodyDto;

export async function updateContractSigner(
	body: UpdateContractSignerVariables,
): Promise<UpdateContractSignerResponseDto> {
	const parsedBody = UpdateContractSignerBodySchema.parse(body);

	const response = await apiFetch(updateContractSignerContract.path, {
		method: updateContractSignerContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return UpdateContractSignerResponseSchema.parse(response);
}
