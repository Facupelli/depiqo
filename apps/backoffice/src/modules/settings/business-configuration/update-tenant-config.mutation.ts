import type { UpdateTenantConfigResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { currentBusinessKeys } from "@/application/current-business/current-business.queries";
import { rentalFinancialReportKeys } from "@/modules/finances/rental-financial-report/rental-financial-report.queries";
import { reportKeys } from "@/modules/reports/public";
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
			invalidates: [
				currentBusinessKeys.all(),
				rentalFinancialReportKeys.all(),
				reportKeys.all(),
			],
			...options?.meta,
		},
	});
}
