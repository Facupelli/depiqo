import type { RegisterTenantWithOwnerResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { v2AuthKeys } from "@/auth/auth.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type RegisterTenantWithOwnerVariables,
	registerTenantWithOwner,
} from "./register-tenant-with-owner.api";

type RegisterTenantWithOwnerOptions = Omit<
	MutationOptions<
		RegisterTenantWithOwnerResponseDto,
		ProblemDetailsError,
		RegisterTenantWithOwnerVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useRegisterTenantWithOwner(
	options?: RegisterTenantWithOwnerOptions,
) {
	return useMutation<
		RegisterTenantWithOwnerResponseDto,
		ProblemDetailsError,
		RegisterTenantWithOwnerVariables
	>({
		...options,
		mutationFn: registerTenantWithOwner,
		meta: {
			invalidates: v2AuthKeys.all(),
			...options?.meta,
		},
	});
}
