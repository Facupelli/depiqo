import type { RefreshCustomDomainStatusResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { tenantKeys } from "../tenant.queries";
import { refreshCustomDomainStatus } from "./refresh-custom-domain-status.api";

type RefreshCustomDomainStatusOptions = Omit<
	MutationOptions<
		RefreshCustomDomainStatusResponseDto,
		ProblemDetailsError,
		void
	>,
	"mutationFn" | "mutationKey"
>;

export function useRefreshCustomDomainStatus(
	options?: RefreshCustomDomainStatusOptions,
) {
	return useMutation<
		RefreshCustomDomainStatusResponseDto,
		ProblemDetailsError,
		void
	>({
		...options,
		mutationFn: refreshCustomDomainStatus,
		meta: {
			invalidates: tenantKeys.all(),
			...options?.meta,
		},
	});
}
