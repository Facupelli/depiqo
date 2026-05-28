import type { CustomerGoogleFinalizeResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { v2AuthKeys } from "../auth.queries";
import {
	type CustomerGoogleFinalizeVariables,
	finalizeCustomerGoogleLogin,
} from "./customer-google-finalize.api";

type CustomerGoogleFinalizeOptions = Omit<
	MutationOptions<
		CustomerGoogleFinalizeResponseDto,
		ProblemDetailsError,
		CustomerGoogleFinalizeVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useFinalizeCustomerGoogleLogin(
	options?: CustomerGoogleFinalizeOptions,
) {
	return useMutation<
		CustomerGoogleFinalizeResponseDto,
		ProblemDetailsError,
		CustomerGoogleFinalizeVariables
	>({
		...options,
		mutationFn: finalizeCustomerGoogleLogin,
		meta: {
			invalidates: v2AuthKeys.all(),
			...options?.meta,
		},
	});
}
