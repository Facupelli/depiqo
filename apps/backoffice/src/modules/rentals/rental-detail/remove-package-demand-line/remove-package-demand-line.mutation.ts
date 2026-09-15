import type { RemoveConfirmedPackageDemandLineResponseDto } from "@repo/api-contracts";
import { type MutationOptions, useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { contractKeys } from "../documents/signing/rental-contract-signing.queries";
import {
	type RemovePackageDemandLineVariables,
	removePackageDemandLine,
} from "./remove-package-demand-line.api";

type RemovePackageDemandLineOptions = Omit<
	MutationOptions<
		RemoveConfirmedPackageDemandLineResponseDto,
		ProblemDetailsError,
		RemovePackageDemandLineVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useRemovePackageDemandLine(
	options?: RemovePackageDemandLineOptions,
) {
	return useMutation({
		...options,
		mutationFn: removePackageDemandLine,
		meta: {
			invalidates: (variables: RemovePackageDemandLineVariables) => [
				rentalKeys.all(),
				contractKeys.rentalSigningSummary(variables.rentalId),
			],
			...options?.meta,
		},
	});
}
