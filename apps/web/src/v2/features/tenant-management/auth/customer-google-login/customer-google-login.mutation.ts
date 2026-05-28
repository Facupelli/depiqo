import type { CustomerGoogleLoginResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { v2AuthKeys } from "../auth.queries";
import {
	type CustomerGoogleLoginVariables,
	customerGoogleLogin,
} from "./customer-google-login.api";

type CustomerGoogleLoginOptions = Omit<
	MutationOptions<
		CustomerGoogleLoginResponseDto,
		ProblemDetailsError,
		CustomerGoogleLoginVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCustomerGoogleLogin(options?: CustomerGoogleLoginOptions) {
	return useMutation<
		CustomerGoogleLoginResponseDto,
		ProblemDetailsError,
		CustomerGoogleLoginVariables
	>({
		...options,
		mutationFn: customerGoogleLogin,
		meta: {
			invalidates: v2AuthKeys.all(),
			...options?.meta,
		},
	});
}
