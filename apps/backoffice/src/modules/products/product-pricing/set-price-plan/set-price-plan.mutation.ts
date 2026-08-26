import type { AttachRatePlanToRentalOfferResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { productKeys } from "@/modules/products/products.queries";
import { rentalOfferPricingKeys } from "@/modules/products/rental-offer-pricing.keys";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type AttachRatePlanToRentalOfferVariables,
	attachRatePlanToRentalOffer,
} from "./set-price-plan.api";

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
