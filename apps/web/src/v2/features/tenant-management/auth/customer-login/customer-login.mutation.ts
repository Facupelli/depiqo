import type { CustomerLoginResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { v2AuthKeys } from "../auth.queries";
import {
	type CustomerLoginVariables,
	customerLogin,
} from "./customer-login.api";

type CustomerLoginOptions = Omit<
	MutationOptions<
		CustomerLoginResponseDto,
		ProblemDetailsError,
		CustomerLoginVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCustomerLogin(options?: CustomerLoginOptions) {
	return useMutation<
		CustomerLoginResponseDto,
		ProblemDetailsError,
		CustomerLoginVariables
	>({
		...options,
		mutationFn: customerLogin,
		meta: {
			invalidates: v2AuthKeys.all(),
			...options?.meta,
		},
	});
}
