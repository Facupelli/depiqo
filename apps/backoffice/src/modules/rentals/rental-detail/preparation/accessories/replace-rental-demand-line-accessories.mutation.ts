import type { ReplaceRentalDemandLineAccessoriesResponseDto } from "@repo/api-contracts";
import { type MutationOptions, useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { contractKeys } from "../../documents/signing/rental-contract-signing.queries";
import { rentalAccessoryDefaultKeys } from "./rental-accessory-defaults.queries";
import {
	type ReplaceRentalDemandLineAccessoriesVariables,
	replaceRentalDemandLineAccessories,
} from "./replace-rental-demand-line-accessories.api";

type Options = Omit<
	MutationOptions<
		ReplaceRentalDemandLineAccessoriesResponseDto,
		ProblemDetailsError,
		ReplaceRentalDemandLineAccessoriesVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useReplaceRentalDemandLineAccessories(options?: Options) {
	return useMutation<
		ReplaceRentalDemandLineAccessoriesResponseDto,
		ProblemDetailsError,
		ReplaceRentalDemandLineAccessoriesVariables
	>({
		...options,
		mutationFn: replaceRentalDemandLineAccessories,
		meta: {
			invalidates: (variables: ReplaceRentalDemandLineAccessoriesVariables) => [
				rentalKeys.detail(variables.rentalId),
				rentalAccessoryDefaultKeys.detail(variables.rentalId),
				contractKeys.rentalSigningSummary(variables.rentalId),
			],
			...options?.meta,
		},
	});
}
