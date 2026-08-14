import {
	type RefreshCustomDomainStatusResponseDto,
	RefreshCustomDomainStatusResponseSchema,
	refreshCustomDomainStatusContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function refreshCustomDomainStatus(): Promise<RefreshCustomDomainStatusResponseDto> {
	const response = await apiFetch(refreshCustomDomainStatusContract.path, {
		method: refreshCustomDomainStatusContract.method,
	});

	return RefreshCustomDomainStatusResponseSchema.parse(response);
}
