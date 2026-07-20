import {
	type CustomerLoginBodyDto,
	CustomerLoginBodySchema,
	type CustomerLoginResponseDto,
	CustomerLoginResponseSchema,
	customerLoginContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";
import { setCsrfToken } from "../csrf-token";

export type CustomerLoginVariables = {
	body: CustomerLoginBodyDto;
};

export async function customerLogin({
	body,
}: CustomerLoginVariables): Promise<CustomerLoginResponseDto> {
	const parsedBody = CustomerLoginBodySchema.parse(body);

	const response = await apiFetch(customerLoginContract.path, {
		method: customerLoginContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	const data = CustomerLoginResponseSchema.parse(response);
	setCsrfToken(data.csrfToken);

	return data;
}
