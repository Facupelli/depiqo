import {
	type GetCurrentTenantResponseDto,
	GetCurrentTenantResponseSchema,
	getCurrentTenantContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getCurrentBusiness(): Promise<GetCurrentTenantResponseDto> {
	const response = await apiFetch(getCurrentTenantContract.path, {
		method: getCurrentTenantContract.method,
	});

	return GetCurrentTenantResponseSchema.parse(response);
}
