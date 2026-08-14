import type { CreateDraftRentalResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { rentalKeys } from "../../rentals/rentals.queries";
import {
	type CreateDraftRentalVariables,
	createDraftRental,
} from "./create-draft-rental.api";

type CreateDraftRentalOptions = Omit<
	MutationOptions<
		CreateDraftRentalResponseDto,
		ProblemDetailsError,
		CreateDraftRentalVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateDraftRental(options?: CreateDraftRentalOptions) {
	return useMutation<
		CreateDraftRentalResponseDto,
		ProblemDetailsError,
		CreateDraftRentalVariables
	>({
		...options,
		mutationFn: createDraftRental,
		meta: {
			invalidates: rentalKeys.lists(),
			...options?.meta,
		},
	});
}
