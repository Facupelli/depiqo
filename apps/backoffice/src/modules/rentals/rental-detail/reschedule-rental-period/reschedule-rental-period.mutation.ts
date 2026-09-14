import type { RescheduleConfirmedRentalPeriodResponseDto } from "@repo/api-contracts";
import { type MutationOptions, useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { contractKeys } from "../documents/signing/rental-contract-signing.queries";
import {
	type RescheduleRentalPeriodVariables,
	rescheduleRentalPeriod,
} from "./reschedule-rental-period.api";

type RescheduleRentalPeriodOptions = Omit<
	MutationOptions<
		RescheduleConfirmedRentalPeriodResponseDto,
		ProblemDetailsError,
		RescheduleRentalPeriodVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useRescheduleRentalPeriod(
	options?: RescheduleRentalPeriodOptions,
) {
	return useMutation({
		...options,
		mutationFn: rescheduleRentalPeriod,
		meta: {
			invalidates: (variables: RescheduleRentalPeriodVariables) => [
				rentalKeys.all(),
				contractKeys.rentalSigningSummary(variables.rentalId),
			],
			...options?.meta,
		},
	});
}
