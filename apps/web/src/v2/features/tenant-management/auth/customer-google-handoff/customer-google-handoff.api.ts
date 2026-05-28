import {
	type CustomerGoogleHandoffBodyDto,
	CustomerGoogleHandoffBodySchema,
	type CustomerGoogleHandoffResponseDto,
	CustomerGoogleHandoffResponseSchema,
	customerGoogleHandoffContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type CustomerGoogleHandoffVariables = {
	body: CustomerGoogleHandoffBodyDto;
};

export async function createCustomerGoogleHandoff({
	body,
}: CustomerGoogleHandoffVariables): Promise<CustomerGoogleHandoffResponseDto> {
	const parsedBody = CustomerGoogleHandoffBodySchema.parse(body);

	const response = await apiFetch(customerGoogleHandoffContract.path, {
		method: customerGoogleHandoffContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return CustomerGoogleHandoffResponseSchema.parse(response);
}
