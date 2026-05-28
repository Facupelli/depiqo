import {
	type RejectSubmittedCustomerOnboardingBodyDto,
	RejectSubmittedCustomerOnboardingBodySchema,
	RejectSubmittedCustomerOnboardingParamsSchema,
	type RejectSubmittedCustomerOnboardingResponseDto,
	RejectSubmittedCustomerOnboardingResponseSchema,
	rejectSubmittedCustomerOnboardingContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type RejectSubmittedCustomerOnboardingVariables = {
	customerId: string;
	body: RejectSubmittedCustomerOnboardingBodyDto;
};

export async function rejectSubmittedCustomerOnboarding({
	customerId,
	body,
}: RejectSubmittedCustomerOnboardingVariables): Promise<RejectSubmittedCustomerOnboardingResponseDto> {
	const parsedParams = RejectSubmittedCustomerOnboardingParamsSchema.parse({
		customerId,
	});
	const parsedBody = RejectSubmittedCustomerOnboardingBodySchema.parse(body);
	const path = rejectSubmittedCustomerOnboardingContract.path.replace(
		":customerId",
		encodeURIComponent(parsedParams.customerId),
	);

	const response = await apiFetch(path, {
		method: rejectSubmittedCustomerOnboardingContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return RejectSubmittedCustomerOnboardingResponseSchema.parse(response);
}
