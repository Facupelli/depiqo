import type { UpdateDraftRentalResponseDto } from "@repo/api-contracts";
import { type MutationOptions, useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type UpdateDraftRentalVariables,
	updateDraftRental,
} from "./update-draft-rental.api";

type UpdateDraftRentalOptions = Omit<
	MutationOptions<
		UpdateDraftRentalResponseDto,
		ProblemDetailsError,
		UpdateDraftRentalVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useUpdateDraftRental(options?: UpdateDraftRentalOptions) {
	return useMutation<
		UpdateDraftRentalResponseDto,
		ProblemDetailsError,
		UpdateDraftRentalVariables
	>({
		...options,
		mutationFn: updateDraftRental,
		meta: {
			invalidates: rentalKeys.all(),
			...options?.meta,
		},
	});
}
