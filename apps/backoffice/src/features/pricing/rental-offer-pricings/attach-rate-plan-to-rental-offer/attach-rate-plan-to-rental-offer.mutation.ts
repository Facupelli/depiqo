import type { AttachRatePlanToRentalOfferResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { productKeys } from "@/modules/products/products.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { rentalOfferPricingKeys } from "../rental-offer-pricings.queries";
import {
	type AttachRatePlanToRentalOfferVariables,
	attachRatePlanToRentalOffer,
} from "./attach-rate-plan-to-rental-offer.api";

type AttachRatePlanToRentalOfferOptions = Omit<
	MutationOptions<
		AttachRatePlanToRentalOfferResponseDto,
		ProblemDetailsError,
		AttachRatePlanToRentalOfferVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useAttachRatePlanToRentalOffer(
	options?: AttachRatePlanToRentalOfferOptions,
) {
	return useMutation<
		AttachRatePlanToRentalOfferResponseDto,
		ProblemDetailsError,
		AttachRatePlanToRentalOfferVariables
	>({
		...options,
		mutationFn: attachRatePlanToRentalOffer,
		meta: {
			invalidates: [rentalOfferPricingKeys.all(), productKeys.all()],
			...options?.meta,
		},
	});
}
