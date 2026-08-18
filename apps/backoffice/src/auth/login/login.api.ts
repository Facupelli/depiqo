import {
	type LoginBodyDto,
	LoginBodySchema,
	type LoginResponseDto,
	LoginResponseSchema,
	loginContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";
import { setCsrfToken } from "@/lib/api/csrf-token";

export type LoginVariables = {
	body: LoginBodyDto;
};

export async function login({
	body,
}: LoginVariables): Promise<LoginResponseDto> {
	const parsedBody = LoginBodySchema.parse(body);

	const response = await apiFetch(loginContract.path, {
		method: loginContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	const data = LoginResponseSchema.parse(response);
	setCsrfToken(data.csrfToken);

	return data;
}
