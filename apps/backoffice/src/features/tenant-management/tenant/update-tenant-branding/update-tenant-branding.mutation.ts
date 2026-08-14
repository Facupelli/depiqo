import type { UpdateTenantBrandingResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { tenantKeys } from "../tenant.queries";
import {
	type UpdateTenantBrandingVariables,
	updateTenantBranding,
} from "./update-tenant-branding.api";

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
