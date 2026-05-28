import type { CreateConfirmedRentalResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type CreateConfirmedRentalVariables,
	createConfirmedRental,
} from "./create-confirmed-rental.api";

type CreateConfirmedRentalOptions = Omit<
	MutationOptions<
		CreateConfirmedRentalResponseDto,
		ProblemDetailsError,
		CreateConfirmedRentalVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateConfirmedRental(
	options?: CreateConfirmedRentalOptions,
) {
	return useMutation<
		CreateConfirmedRentalResponseDto,
		ProblemDetailsError,
		CreateConfirmedRentalVariables
	>({
		...options,
		mutationFn: createConfirmedRental,
	});
}
