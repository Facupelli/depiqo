import type { UpdateTenantConfigResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { tenantKeys } from "@/features/tenant-management/tenant/tenant.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type UpdateTenantConfigVariables,
	updateTenantConfig,
} from "./update-tenant-config.api";

type UpdateTenantConfigOptions = Omit<
	MutationOptions<
		UpdateTenantConfigResponseDto,
		ProblemDetailsError,
		UpdateTenantConfigVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useUpdateTenantConfig(options?: UpdateTenantConfigOptions) {
	return useMutation<
		UpdateTenantConfigResponseDto,
		ProblemDetailsError,
		UpdateTenantConfigVariables
	>({
		...options,
		mutationFn: updateTenantConfig,
		meta: {
			invalidates: tenantKeys.all(),
			...options?.meta,
		},
	});
}
