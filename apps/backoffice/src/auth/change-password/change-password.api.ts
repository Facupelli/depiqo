import {
	ChangePasswordBodySchema,
	type ChangePasswordResponseDto,
	ChangePasswordResponseSchema,
	changePasswordContract,
} from "@repo/api-contracts";
import type { z } from "zod";
import { apiFetch } from "@/lib/api/api-fetch";
import { setCsrfToken } from "@/lib/api/csrf-token";

export type ChangePasswordBodyDto = z.infer<typeof ChangePasswordBodySchema>;

export type ChangePasswordVariables = {
	body: ChangePasswordBodyDto;
};

export async function changePassword({
	body,
}: ChangePasswordVariables): Promise<ChangePasswordResponseDto> {
	const parsedBody = ChangePasswordBodySchema.parse(body);

	const response = await apiFetch(changePasswordContract.path, {
		method: changePasswordContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	const data = ChangePasswordResponseSchema.parse(response);
	setCsrfToken(data.csrfToken);

	return data;
}
