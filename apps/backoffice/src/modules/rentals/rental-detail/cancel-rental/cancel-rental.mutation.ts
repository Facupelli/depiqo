import type { CancelRentalResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
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
