import {
	type RegisterTenantWithOwnerBodyDto,
	RegisterTenantWithOwnerBodySchema,
	type RegisterTenantWithOwnerResponseDto,
	RegisterTenantWithOwnerResponseSchema,
	registerTenantWithOwnerContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type RegisterBusinessVariables = {
	body: RegisterTenantWithOwnerBodyDto;
};

export async function registerBusiness({
	body,
}: RegisterBusinessVariables): Promise<RegisterTenantWithOwnerResponseDto> {
	const parsedBody = RegisterTenantWithOwnerBodySchema.parse(body);

	const response = await apiFetch(registerTenantWithOwnerContract.path, {
		method: registerTenantWithOwnerContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return RegisterTenantWithOwnerResponseSchema.parse(response);
}
