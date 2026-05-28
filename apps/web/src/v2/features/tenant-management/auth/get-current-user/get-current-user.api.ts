import {
	type GetCurrentUserResponseDto,
	GetCurrentUserResponseSchema,
	getCurrentUserContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function getCurrentUser(): Promise<GetCurrentUserResponseDto> {
	const response = await apiFetch(getCurrentUserContract.path, {
		method: getCurrentUserContract.method,
	});

	return GetCurrentUserResponseSchema.parse(response);
}
