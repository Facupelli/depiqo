import {
	type GetCurrentTenantResponseDto,
	GetCurrentTenantResponseSchema,
	getCurrentTenantContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function getCurrentTenant(): Promise<GetCurrentTenantResponseDto> {
	const response = await apiFetch(getCurrentTenantContract.path, {
		method: getCurrentTenantContract.method,
	});

	return GetCurrentTenantResponseSchema.parse(response);
}
