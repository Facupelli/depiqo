import {
	type CorrectRatePlanBodyDto,
	CorrectRatePlanBodySchema,
	type GetRatePlanDetailResponseDto,
} from "@repo/api-contracts";
import type { CreatePricePlanBaseFormValues } from "../create-price-plan/create-price-plan.schema";

export function fromPricePlanDetailToFormValues(
	pricePlan: GetRatePlanDetailResponseDto,
): CreatePricePlanBaseFormValues {
	return {
		name: pricePlan.name,
		billingUnit: pricePlan.billingUnit,
		currency: pricePlan.currency,
		tiers: pricePlan.tiers.map((tier) => ({
			fromUnit: tier.fromUnit,
			toUnit: tier.toUnit,
			pricePerUnit: tier.pricePerUnit,
		})),
	};
}

export function toEditPricePlanDto(
	values: CreatePricePlanBaseFormValues,
	expectedAffectedRentalOfferIds: string[],
): CorrectRatePlanBodyDto {
	return CorrectRatePlanBodySchema.parse({
		name: values.name.trim(),
		billingUnit: values.billingUnit,
		currency: values.currency.trim().toUpperCase(),
		tiers: values.tiers.map((tier) => ({
			fromUnit: tier.fromUnit,
			toUnit: tier.toUnit,
			pricePerUnit: tier.pricePerUnit.trim(),
		})),
		expectedAffectedRentalOfferIds,
	});
}
