import type { ApproveSubmittedCustomerOnboardingResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { rentalCustomerKeys } from "../rental-customer.queries";
import {
	type ApproveSubmittedCustomerOnboardingVariables,
	approveSubmittedCustomerOnboarding,
} from "./approve-submitted-customer-onboarding.api";

type ApproveSubmittedCustomerOnboardingOptions = Omit<
	MutationOptions<
		ApproveSubmittedCustomerOnboardingResponseDto,
		ProblemDetailsError,
		ApproveSubmittedCustomerOnboardingVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useApproveSubmittedCustomerOnboarding(
	options?: ApproveSubmittedCustomerOnboardingOptions,
) {
	return useMutation<
		ApproveSubmittedCustomerOnboardingResponseDto,
		ProblemDetailsError,
		ApproveSubmittedCustomerOnboardingVariables
	>({
		...options,
		mutationFn: approveSubmittedCustomerOnboarding,
		meta: {
			invalidates: rentalCustomerKeys.all(),
			...options?.meta,
		},
	});
}
