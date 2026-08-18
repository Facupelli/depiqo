import type { AssignCustomerToDraftRentalResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type AssignCustomerToDraftRentalVariables,
	assignCustomerToDraftRental,
} from "./assign-customer-to-draft-rental.api";

type AssignCustomerToDraftRentalOptions = Omit<
	MutationOptions<
		AssignCustomerToDraftRentalResponseDto,
		ProblemDetailsError,
		AssignCustomerToDraftRentalVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useAssignCustomerToDraftRental(
	options?: AssignCustomerToDraftRentalOptions,
) {
	return useMutation<
		AssignCustomerToDraftRentalResponseDto,
		ProblemDetailsError,
		AssignCustomerToDraftRentalVariables
	>({
		...options,
		mutationFn: assignCustomerToDraftRental,
		meta: {
			invalidates: (variables: AssignCustomerToDraftRentalVariables) =>
				rentalKeys.detail(variables.rentalId),
			...options?.meta,
		},
	});
}
