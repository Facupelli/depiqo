import type { ConfirmRentalResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { rentalKeys } from "../rentals.queries";
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
