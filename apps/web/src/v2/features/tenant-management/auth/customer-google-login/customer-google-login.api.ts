import {
	type CustomerGoogleLoginBodyDto,
	CustomerGoogleLoginBodySchema,
	type CustomerGoogleLoginResponseDto,
	CustomerGoogleLoginResponseSchema,
	customerGoogleLoginContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";
import { setCsrfToken } from "../csrf-token";

export type CustomerGoogleLoginVariables = {
	body: CustomerGoogleLoginBodyDto;
};

export async function customerGoogleLogin({
	body,
}: CustomerGoogleLoginVariables): Promise<CustomerGoogleLoginResponseDto> {
	const parsedBody = CustomerGoogleLoginBodySchema.parse(body);

	const response = await apiFetch(customerGoogleLoginContract.path, {
		method: customerGoogleLoginContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	const data = CustomerGoogleLoginResponseSchema.parse(response);
	setCsrfToken(data.csrfToken);

	return data;
}
