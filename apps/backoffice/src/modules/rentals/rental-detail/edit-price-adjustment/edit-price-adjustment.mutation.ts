import type { ChangeRentalDetailsResponseDto } from "@repo/api-contracts";
import { type MutationOptions, useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type ChangeRentalDetailsVariables,
	changeRentalDetails,
} from "./change-rental-details.api";

type EditPriceAdjustmentOptions = Omit<
	MutationOptions<
		ChangeRentalDetailsResponseDto,
		ProblemDetailsError,
		ChangeRentalDetailsVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useEditPriceAdjustment(options?: EditPriceAdjustmentOptions) {
	return useMutation({
		...options,
		mutationFn: changeRentalDetails,
		meta: {
			invalidates: rentalKeys.all(),
			...options?.meta,
		},
	});
}
