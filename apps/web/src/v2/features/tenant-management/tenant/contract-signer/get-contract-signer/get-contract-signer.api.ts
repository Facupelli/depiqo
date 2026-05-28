import {
	type GetContractSignerResponseDto,
	GetContractSignerResponseSchema,
	getContractSignerContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function getContractSigner(): Promise<GetContractSignerResponseDto> {
	const response = await apiFetch(getContractSignerContract.path, {
		method: getContractSignerContract.method,
	});

	return GetContractSignerResponseSchema.parse(response);
}
