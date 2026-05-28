import {
	ApproveSubmittedCustomerOnboardingParamsSchema,
	type ApproveSubmittedCustomerOnboardingResponseDto,
	ApproveSubmittedCustomerOnboardingResponseSchema,
	approveSubmittedCustomerOnboardingContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type ApproveSubmittedCustomerOnboardingVariables = {
	customerId: string;
};

export async function approveSubmittedCustomerOnboarding({
	customerId,
}: ApproveSubmittedCustomerOnboardingVariables): Promise<ApproveSubmittedCustomerOnboardingResponseDto> {
	const parsedParams = ApproveSubmittedCustomerOnboardingParamsSchema.parse({
		customerId,
	});
	const path = approveSubmittedCustomerOnboardingContract.path.replace(
		":customerId",
		encodeURIComponent(parsedParams.customerId),
	);

	const response = await apiFetch(path, {
		method: approveSubmittedCustomerOnboardingContract.method,
	});

	return ApproveSubmittedCustomerOnboardingResponseSchema.parse(response);
}
