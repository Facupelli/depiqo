import type { CreateRatePlanAndAttachToRentalOfferResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { rentableItemKeys } from "@/features/catalog/rentable-items/rentable-items.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { rentalOfferPricingKeys } from "../rental-offer-pricings.queries";
import {
	type CreateRatePlanAndAttachToRentalOfferVariables,
	createRatePlanAndAttachToRentalOffer,
} from "./create-rate-plan-and-attach-to-rental-offer.api";

type CreateRatePlanAndAttachToRentalOfferOptions = Omit<
	MutationOptions<
		CreateRatePlanAndAttachToRentalOfferResponseDto,
		ProblemDetailsError,
		CreateRatePlanAndAttachToRentalOfferVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateRatePlanAndAttachToRentalOffer(
	options?: CreateRatePlanAndAttachToRentalOfferOptions,
) {
	return useMutation<
		CreateRatePlanAndAttachToRentalOfferResponseDto,
		ProblemDetailsError,
		CreateRatePlanAndAttachToRentalOfferVariables
	>({
		...options,
		mutationFn: createRatePlanAndAttachToRentalOffer,
		meta: {
			invalidates: [rentalOfferPricingKeys.all(), rentableItemKeys.all()],
			...options?.meta,
		},
		onError: (error) => {
			console.log({ error });
		},
	});
}
