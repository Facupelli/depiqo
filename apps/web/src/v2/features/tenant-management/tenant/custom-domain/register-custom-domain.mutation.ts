import type { RegisterCustomDomainResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { tenantKeys } from "../tenant.queries";
import {
	type RegisterCustomDomainVariables,
	registerCustomDomain,
} from "./register-custom-domain.api";

type RegisterCustomDomainOptions = Omit<
	MutationOptions<
		RegisterCustomDomainResponseDto,
		ProblemDetailsError,
		RegisterCustomDomainVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useRegisterCustomDomain(options?: RegisterCustomDomainOptions) {
	return useMutation<
		RegisterCustomDomainResponseDto,
		ProblemDetailsError,
		RegisterCustomDomainVariables
	>({
		...options,
		mutationFn: registerCustomDomain,
		meta: {
			invalidates: tenantKeys.all(),
			...options?.meta,
		},
	});
}
