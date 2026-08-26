import type { ConfirmRentalResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type ConfirmRentalVariables,
	confirmRental,
} from "./confirm-rental.api";

type ConfirmRentalOptions = Omit<
	MutationOptions<
		ConfirmRentalResponseDto,
		ProblemDetailsError,
		ConfirmRentalVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useConfirmRental(options?: ConfirmRentalOptions) {
	return useMutation<
		ConfirmRentalResponseDto,
		ProblemDetailsError,
		ConfirmRentalVariables
	>({
		...options,
		mutationFn: confirmRental,
		meta: {
			invalidates: rentalKeys.all(),
			...options?.meta,
		},
	});
}
