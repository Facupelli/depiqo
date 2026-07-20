import type { CancelRentalResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { rentalKeys } from "../rentals.queries";
import { type CancelRentalVariables, cancelRental } from "./cancel-rental.api";

type CancelRentalOptions = Omit<
	MutationOptions<
		CancelRentalResponseDto,
		ProblemDetailsError,
		CancelRentalVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCancelRental(options?: CancelRentalOptions) {
	return useMutation<
		CancelRentalResponseDto,
		ProblemDetailsError,
		CancelRentalVariables
	>({
		...options,
		mutationFn: cancelRental,
		meta: {
			invalidates: rentalKeys.all(),
			...options?.meta,
		},
	});
}
