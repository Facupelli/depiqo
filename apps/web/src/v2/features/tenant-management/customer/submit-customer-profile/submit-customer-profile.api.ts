import {
	type SubmitCustomerProfileBodyDto,
	SubmitCustomerProfileBodySchema,
	type SubmitCustomerProfileResponseDto,
	SubmitCustomerProfileResponseSchema,
	submitCustomerProfileContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type SubmitCustomerProfileVariables = {
	body: SubmitCustomerProfileBodyDto;
};

export async function submitCustomerProfile({
	body,
}: SubmitCustomerProfileVariables): Promise<SubmitCustomerProfileResponseDto> {
	const parsedBody = SubmitCustomerProfileBodySchema.parse(body);

	const response = await apiFetch(submitCustomerProfileContract.path, {
		method: submitCustomerProfileContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return SubmitCustomerProfileResponseSchema.parse(response);
}
