import type {
	CreatePricingForRentalOfferBodyDto,
	CreatePricingForRentalOfferResponseDto,
} from "@repo/api-contracts";
import { useMutation } from "@tanstack/react-query";
import {
	equipmentTypeRentalUsageKeys,
	listEquipmentTypeKeys,
} from "@/modules/inventory/equipment-types/public";
import { pricePlanKeys } from "@/modules/pricing/price-plans/public";
import { productKeys } from "@/modules/products/products.queries";
import { rentalOfferPricingKeys } from "@/modules/products/rental-offer-pricing.keys";
import type { ProblemDetailsError } from "@/shared/errors";
import { createPricingForRentalOffer } from "./create-pricing-for-rental-offer.api";

export function useCreatePricingForRentalOffer() {
	return useMutation<
		CreatePricingForRentalOfferResponseDto,
		ProblemDetailsError,
		CreatePricingForRentalOfferBodyDto
	>({
		mutationFn: createPricingForRentalOffer,
		meta: {
			invalidates: [
				rentalOfferPricingKeys.all(),
				pricePlanKeys.all(),
				productKeys.all(),
				listEquipmentTypeKeys.lists(),
				equipmentTypeRentalUsageKeys.all(),
			],
		},
	});
}
