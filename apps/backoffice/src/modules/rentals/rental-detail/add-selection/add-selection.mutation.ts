import type { AddRentalSelectionResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type AddRentalSelectionVariables,
	addRentalSelection,
} from "./add-selection.api";

type AddRentalSelectionOptions = Omit<
	MutationOptions<
		AddRentalSelectionResponseDto,
		ProblemDetailsError,
		AddRentalSelectionVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useAddRentalSelection(options?: AddRentalSelectionOptions) {
	return useMutation<
		AddRentalSelectionResponseDto,
		ProblemDetailsError,
		AddRentalSelectionVariables
	>({
		...options,
		mutationFn: addRentalSelection,
		meta: {
			invalidates: rentalKeys.all(),
			...options?.meta,
		},
	});
}
