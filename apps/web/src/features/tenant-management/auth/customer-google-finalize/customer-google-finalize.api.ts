import {
	type CustomerGoogleFinalizeBodyDto,
	CustomerGoogleFinalizeBodySchema,
	type CustomerGoogleFinalizeResponseDto,
	CustomerGoogleFinalizeResponseSchema,
	customerGoogleFinalizeContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";
import { setCsrfToken } from "../csrf-token";

export type CustomerGoogleFinalizeVariables = {
	body: CustomerGoogleFinalizeBodyDto;
};

export async function finalizeCustomerGoogleLogin({
	body,
}: CustomerGoogleFinalizeVariables): Promise<CustomerGoogleFinalizeResponseDto> {
	const parsedBody = CustomerGoogleFinalizeBodySchema.parse(body);

	const response = await apiFetch(customerGoogleFinalizeContract.path, {
		method: customerGoogleFinalizeContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	const data = CustomerGoogleFinalizeResponseSchema.parse(response);
	setCsrfToken(data.csrfToken);

	return data;
}
