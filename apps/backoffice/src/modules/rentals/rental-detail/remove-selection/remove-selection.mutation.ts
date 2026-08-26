import type { RemoveRentalSelectionResponseDto } from "@repo/api-contracts";
import { type MutationOptions, useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type RemoveSelectionVariables,
	removeSelection,
} from "./remove-selection.api";

type RemoveSelectionOptions = Omit<
	MutationOptions<
		RemoveRentalSelectionResponseDto,
		ProblemDetailsError,
		RemoveSelectionVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useRemoveSelection(options?: RemoveSelectionOptions) {
	return useMutation({
		...options,
		mutationFn: removeSelection,
		meta: {
			invalidates: rentalKeys.all(),
			...options?.meta,
		},
	});
}
