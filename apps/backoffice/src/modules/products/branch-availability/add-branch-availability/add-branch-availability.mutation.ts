import type {
	CreateRentalOfferWithPricingBodyDto,
	CreateRentalOfferWithPricingResponseDto,
} from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { pricePlanKeys } from "@/modules/pricing/price-plans/public";
import { productKeys } from "@/modules/products/products.queries";
import { rentalOfferPricingKeys } from "@/modules/products/rental-offer-pricing.keys";
import type { ProblemDetailsError } from "@/shared/errors";
import { createRentalOfferWithPricing } from "./add-branch-availability.api";

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
			invalidates: [
				productKeys.all(),
				rentalOfferPricingKeys.all(),
				pricePlanKeys.all(),
			],
			...options?.meta,
		},
	});
}
