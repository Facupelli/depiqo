import type { ChangeRentalSelectionQuantityResponseDto } from "@repo/api-contracts";
import { type MutationOptions, useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { contractKeys } from "../documents/signing/rental-contract-signing.queries";
import {
	type ChangeSelectionQuantityVariables,
	changeSelectionQuantity,
} from "./change-selection-quantity.api";

type ChangeSelectionQuantityOptions = Omit<
	MutationOptions<
		ChangeRentalSelectionQuantityResponseDto,
		ProblemDetailsError,
		ChangeSelectionQuantityVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useChangeSelectionQuantity(
	options?: ChangeSelectionQuantityOptions,
) {
	return useMutation({
		...options,
		mutationFn: changeSelectionQuantity,
		meta: {
			invalidates: (variables: ChangeSelectionQuantityVariables) => [
				rentalKeys.all(),
				contractKeys.rentalSigningSummary(variables.rentalId),
			],
			...options?.meta,
		},
	});
}
