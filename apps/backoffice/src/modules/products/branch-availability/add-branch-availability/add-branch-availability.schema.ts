import {
	type CreateRentalOfferWithPricingBodyDto,
	CreateRentalOfferWithPricingBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import {
	type CreatePricePlanBaseFormValues,
	createPricePlanBaseFormDefaultValues,
	createPricePlanBaseFormSchema,
} from "@/modules/pricing/price-plans/public";
import {
	type PricePlanSelectionFormValues,
	pricePlanSelectionFormSchema,
} from "@/modules/products/product-pricing/price-plan-selection/price-plan-selection.schema";

export const createRentalOfferWithPricingBranchFormSchema = z.object({
	branchId: z.string().trim().min(1, "La sucursal es obligatoria"),
});

export type CreateRentalOfferWithPricingBranchFormValues = z.infer<
	typeof createRentalOfferWithPricingBranchFormSchema
>;

export function createRentalOfferWithPricingBranchFormDefaultValues(): CreateRentalOfferWithPricingBranchFormValues {
	return {
		branchId: "",
	};
}

export const createBranchAvailabilityWithNewPricePlanFormSchema =
	createPricePlanBaseFormSchema;

export type CreateBranchAvailabilityWithNewPricePlanFormValues =
	CreatePricePlanBaseFormValues;

export function createBranchAvailabilityWithNewPricePlanFormDefaultValues(): CreateBranchAvailabilityWithNewPricePlanFormValues {
	return createPricePlanBaseFormDefaultValues();
}

export function toCreateRentalOfferWithAttachedRatePlanDto(
	values: PricePlanSelectionFormValues,
	context: { rentableItemId: string; branchId: string },
): CreateRentalOfferWithPricingBodyDto {
	const parsedValues = pricePlanSelectionFormSchema.parse(values);
	const dto = {
		rentableItemId: context.rentableItemId.trim(),
		branchId: context.branchId.trim(),
		pricing: {
			mode: "REUSE_RATE_PLAN" as const,
			ratePlanId: parsedValues.ratePlanId.trim(),
		},
	};

	return CreateRentalOfferWithPricingBodySchema.parse(dto);
}

export function toCreateRentalOfferWithCreatedRatePlanDto(
	values: CreateBranchAvailabilityWithNewPricePlanFormValues,
	context: { rentableItemId: string; branchId: string },
): CreateRentalOfferWithPricingBodyDto {
	const parsedValues =
		createBranchAvailabilityWithNewPricePlanFormSchema.parse(values);
	const dto = {
		rentableItemId: context.rentableItemId.trim(),
		branchId: context.branchId.trim(),
		pricing: {
			mode: "CREATE_RATE_PLAN" as const,
			ratePlan: {
				name: parsedValues.name.trim(),
				billingUnit: parsedValues.billingUnit,
				currency: parsedValues.currency.trim().toUpperCase(),
				tiers: parsedValues.tiers.map((tier) => ({
					fromUnit: tier.fromUnit,
					toUnit: tier.toUnit,
					pricePerUnit: tier.pricePerUnit.trim(),
				})),
			},
		},
	};

	return CreateRentalOfferWithPricingBodySchema.parse(dto);
}
