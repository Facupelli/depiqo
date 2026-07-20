import type {
	CreateRentalOfferWithPricingBodyDto,
	CreateRentalOfferWithPricingResponseDto,
} from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { rentableItemKeys } from "@/features/catalog/rentable-items/rentable-items.queries";
import { rentalOfferPricingKeys } from "@/features/pricing/rental-offer-pricings/rental-offer-pricings.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { createRentalOfferWithPricing } from "./create-rental-offer-with-pricing.api";

type CreateRentalOfferWithPricingOptions = Omit<
	MutationOptions<
		CreateRentalOfferWithPricingResponseDto,
		ProblemDetailsError,
		CreateRentalOfferWithPricingBodyDto
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateRentalOfferWithPricing(
	options?: CreateRentalOfferWithPricingOptions,
) {
	return useMutation<
		CreateRentalOfferWithPricingResponseDto,
		ProblemDetailsError,
		CreateRentalOfferWithPricingBodyDto
	>({
		...options,
		mutationFn: createRentalOfferWithPricing,
		meta: {
			invalidates: [rentableItemKeys.all(), rentalOfferPricingKeys.all()],
			...options?.meta,
		},
	});
}
