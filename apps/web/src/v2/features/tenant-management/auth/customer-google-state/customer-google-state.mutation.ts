import type { CustomerGoogleStateResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import type { CustomerGoogleStateVariables } from "./customer-google-state.api";
import { createCustomerGoogleStateFn } from "./customer-google-state.functions";

type CustomerGoogleStateOptions = Omit<
	MutationOptions<
		CustomerGoogleStateResponseDto,
		ProblemDetailsError,
		CustomerGoogleStateVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateCustomerGoogleState(
	options?: CustomerGoogleStateOptions,
) {
	return useMutation<
		CustomerGoogleStateResponseDto,
		ProblemDetailsError,
		CustomerGoogleStateVariables
	>({
		...options,
		mutationFn: ({ body }) => createCustomerGoogleStateFn({ data: body }),
	});
}
