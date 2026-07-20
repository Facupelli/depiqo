import {
	type GetOwnersResponseDto,
	GetOwnersResponseSchema,
	getOwnersContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getOwners(): Promise<GetOwnersResponseDto> {
	const response = await apiFetch(getOwnersContract.path, {
		method: getOwnersContract.method,
	});

	return GetOwnersResponseSchema.parse(response);
}
