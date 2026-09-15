import type { RestoreConfirmedPackageDemandLineResponseDto } from "@repo/api-contracts";
import { type MutationOptions, useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { contractKeys } from "../documents/signing/rental-contract-signing.queries";
import {
	type RestorePackageDemandLineVariables,
	restorePackageDemandLine,
} from "./restore-package-demand-line.api";

type RestorePackageDemandLineOptions = Omit<
	MutationOptions<
		RestoreConfirmedPackageDemandLineResponseDto,
		ProblemDetailsError,
		RestorePackageDemandLineVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useRestorePackageDemandLine(
	options?: RestorePackageDemandLineOptions,
) {
	return useMutation({
		...options,
		mutationFn: restorePackageDemandLine,
		meta: {
			invalidates: (variables: RestorePackageDemandLineVariables) => [
				rentalKeys.all(),
				contractKeys.rentalSigningSummary(variables.rentalId),
			],
			...options?.meta,
		},
	});
}
