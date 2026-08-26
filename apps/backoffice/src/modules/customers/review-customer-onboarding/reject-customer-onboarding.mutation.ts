import type { RejectSubmittedCustomerOnboardingResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { customerKeys } from "../customer.query-keys";
import {
	type RejectSubmittedCustomerOnboardingVariables,
	rejectSubmittedCustomerOnboarding,
} from "./reject-customer-onboarding.api";

type RejectSubmittedCustomerOnboardingOptions = Omit<
	MutationOptions<
		RejectSubmittedCustomerOnboardingResponseDto,
		ProblemDetailsError,
		RejectSubmittedCustomerOnboardingVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useRejectSubmittedCustomerOnboarding(
	options?: RejectSubmittedCustomerOnboardingOptions,
) {
	return useMutation<
		RejectSubmittedCustomerOnboardingResponseDto,
		ProblemDetailsError,
		RejectSubmittedCustomerOnboardingVariables
	>({
		...options,
		mutationFn: rejectSubmittedCustomerOnboarding,
		meta: {
			invalidates: customerKeys.all(),
			...options?.meta,
		},
	});
}
