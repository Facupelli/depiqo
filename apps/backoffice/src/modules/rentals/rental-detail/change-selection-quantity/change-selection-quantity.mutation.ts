import type { ChangeRentalSelectionQuantityResponseDto } from "@repo/api-contracts";
import { type MutationOptions, useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
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
			invalidates: rentalKeys.all(),
			...options?.meta,
		},
	});
}
