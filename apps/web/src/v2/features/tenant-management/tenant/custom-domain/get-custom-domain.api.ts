import {
	type GetCustomDomainResponseDto,
	GetCustomDomainResponseSchema,
	getCustomDomainContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function getCustomDomain(): Promise<GetCustomDomainResponseDto> {
	const response = await apiFetch(getCustomDomainContract.path, {
		method: getCustomDomainContract.method,
	});

	return GetCustomDomainResponseSchema.parse(response);
}
