import type { AssignRentalAccessoriesResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type AssignRentalAccessoriesVariables,
	assignRentalAccessories,
} from "./assign-rental-accessories.api";
import { rentalAccessoryDefaultKeys } from "./rental-accessory-defaults.queries";

type AssignRentalAccessoriesOptions = Omit<
	MutationOptions<
		AssignRentalAccessoriesResponseDto,
		ProblemDetailsError,
		AssignRentalAccessoriesVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useAssignRentalAccessories(
	options?: AssignRentalAccessoriesOptions,
) {
	return useMutation<
		AssignRentalAccessoriesResponseDto,
		ProblemDetailsError,
		AssignRentalAccessoriesVariables
	>({
		...options,
		mutationFn: assignRentalAccessories,
		meta: {
			invalidates: (variables: AssignRentalAccessoriesVariables) => [
				rentalKeys.detail(variables.rentalId),
				rentalAccessoryDefaultKeys.detail(variables.rentalId),
			],
			...options?.meta,
		},
	});
}
