import {
	type CustomerGoogleStateBodyDto,
	CustomerGoogleStateBodySchema,
	type CustomerGoogleStateResponseDto,
	CustomerGoogleStateResponseSchema,
	customerGoogleStateContract,
} from "@repo/api-contracts";
import { storefrontApiFetch } from "@/v2/lib/api/storefront-api-fetch";

export type CustomerGoogleStateVariables = {
	body: CustomerGoogleStateBodyDto;
};

export async function createCustomerGoogleState({
	body,
}: CustomerGoogleStateVariables): Promise<CustomerGoogleStateResponseDto> {
	const parsedBody = CustomerGoogleStateBodySchema.parse(body);

	const response = await storefrontApiFetch({
		path: customerGoogleStateContract.path,
		method: customerGoogleStateContract.method,
		body: parsedBody,
	});

	return CustomerGoogleStateResponseSchema.parse(response);
}
