import type { UpdateTenantBrandingResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { currentBusinessKeys } from "@/application/current-business/current-business.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type UpdateTenantBrandingVariables,
	updateTenantBranding,
} from "./update-branding.api";

type UpdateTenantBrandingOptions = Omit<
	MutationOptions<
		UpdateTenantBrandingResponseDto,
		ProblemDetailsError,
		UpdateTenantBrandingVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useUpdateTenantBranding(options?: UpdateTenantBrandingOptions) {
	return useMutation<
		UpdateTenantBrandingResponseDto,
		ProblemDetailsError,
		UpdateTenantBrandingVariables
	>({
		...options,
		mutationFn: updateTenantBranding,
		meta: {
			invalidates: currentBusinessKeys.all(),
			...options?.meta,
		},
	});
}
