import {
	type GetCurrentUserResponseDto,
	GetCurrentUserResponseSchema,
	getCurrentUserContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getCurrentUser(): Promise<GetCurrentUserResponseDto> {
	const response = await apiFetch(getCurrentUserContract.path, {
		method: getCurrentUserContract.method,
	});

	return GetCurrentUserResponseSchema.parse(response);
}
