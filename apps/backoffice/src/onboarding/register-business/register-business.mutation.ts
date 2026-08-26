import type { RegisterTenantWithOwnerResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { v2AuthKeys } from "@/auth/auth.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type RegisterBusinessVariables,
	registerBusiness,
} from "./register-business.api";

type RegisterBusinessOptions = Omit<
	MutationOptions<
		RegisterTenantWithOwnerResponseDto,
		ProblemDetailsError,
		RegisterBusinessVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useRegisterBusiness(options?: RegisterBusinessOptions) {
	return useMutation<
		RegisterTenantWithOwnerResponseDto,
		ProblemDetailsError,
		RegisterBusinessVariables
	>({
		...options,
		mutationFn: registerBusiness,
		meta: {
			invalidates: v2AuthKeys.all(),
			...options?.meta,
		},
	});
}
