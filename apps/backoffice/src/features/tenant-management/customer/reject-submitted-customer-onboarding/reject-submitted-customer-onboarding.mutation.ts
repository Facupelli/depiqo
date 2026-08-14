import type { RejectSubmittedCustomerOnboardingResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { rentalCustomerKeys } from "../rental-customer.queries";
import {
	type RejectSubmittedCustomerOnboardingVariables,
	rejectSubmittedCustomerOnboarding,
} from "./reject-submitted-customer-onboarding.api";

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
			invalidates: rentalCustomerKeys.all(),
			...options?.meta,
		},
	});
}
