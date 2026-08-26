import type { UpdateRentalOfferVisibilityAndRentabilityResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { productKeys } from "@/modules/products/products.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type UpdateBranchAvailabilityVariables,
	updateBranchAvailability,
} from "./edit-branch-availability.api";

type UpdateBranchAvailabilityOptions = Omit<
	MutationOptions<
		UpdateRentalOfferVisibilityAndRentabilityResponseDto,
		ProblemDetailsError,
		UpdateBranchAvailabilityVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useUpdateBranchAvailability(
	options?: UpdateBranchAvailabilityOptions,
) {
	return useMutation<
		UpdateRentalOfferVisibilityAndRentabilityResponseDto,
		ProblemDetailsError,
		UpdateBranchAvailabilityVariables
	>({
		...options,
		mutationFn: updateBranchAvailability,
		meta: {
			invalidates: productKeys.all(),
			...options?.meta,
		},
	});
}
