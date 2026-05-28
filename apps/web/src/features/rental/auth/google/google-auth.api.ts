import {
	authenticateCustomerWithGoogleResponseSchema,
	authenticateCustomerWithGoogleSchema,
} from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "@/lib/api";

export const authenticateCustomerWithGoogleFn = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			code: string;
			redirectUri: string;
			state: string;
			codeVerifier?: string;
		}) => authenticateCustomerWithGoogleSchema.parse(data),
	)
	.handler(async ({ data }) => {
		const response = await apiFetch("/auth/customer/google", {
			method: "POST",
			body: data,
		});

		return authenticateCustomerWithGoogleResponseSchema.parse(response);
	});
