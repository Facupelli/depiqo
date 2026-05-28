import {
	type RegisterCustomDomainBodyDto,
	RegisterCustomDomainBodySchema,
	type RegisterCustomDomainResponseDto,
	RegisterCustomDomainResponseSchema,
	registerCustomDomainContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type RegisterCustomDomainVariables = {
	body: RegisterCustomDomainBodyDto;
};

export async function registerCustomDomain({
	body,
}: RegisterCustomDomainVariables): Promise<RegisterCustomDomainResponseDto> {
	const parsedBody = RegisterCustomDomainBodySchema.parse(body);

	const response = await apiFetch(registerCustomDomainContract.path, {
		method: registerCustomDomainContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return RegisterCustomDomainResponseSchema.parse(response);
}
