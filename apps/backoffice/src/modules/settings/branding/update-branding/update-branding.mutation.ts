import type { UpdateTenantBrandingResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { tenantKeys } from "@/features/tenant-management/tenant/tenant.queries";
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
			invalidates: tenantKeys.all(),
			...options?.meta,
		},
	});
}
