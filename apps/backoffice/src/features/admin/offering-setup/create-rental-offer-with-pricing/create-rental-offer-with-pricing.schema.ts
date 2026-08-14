import {
	type CreateRentalOfferWithPricingBodyDto,
	CreateRentalOfferWithPricingBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import {
	type CreateRatePlanBaseFormValues,
	createRatePlanBaseFormDefaultValues,
	createRatePlanBaseFormSchema,
} from "@/features/pricing/create-rate-plan/create-rate-plan.schema";
import {
	type AttachRatePlanToRentalOfferFormValues,
	attachRatePlanToRentalOfferFormSchema,
} from "@/features/pricing/rental-offer-pricings/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.schema";

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

export const createRentalOfferWithCreatedRatePlanFormSchema =
	createRatePlanBaseFormSchema;

export type CreateRentalOfferWithCreatedRatePlanFormValues =
	CreateRatePlanBaseFormValues;

export function createRentalOfferWithCreatedRatePlanFormDefaultValues(): CreateRentalOfferWithCreatedRatePlanFormValues {
	return createRatePlanBaseFormDefaultValues();
}

export function toCreateRentalOfferWithAttachedRatePlanDto(
	values: AttachRatePlanToRentalOfferFormValues,
	context: { rentableItemId: string; branchId: string },
): CreateRentalOfferWithPricingBodyDto {
	const parsedValues = attachRatePlanToRentalOfferFormSchema.parse(values);
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
	values: CreateRentalOfferWithCreatedRatePlanFormValues,
	context: { rentableItemId: string; branchId: string },
): CreateRentalOfferWithPricingBodyDto {
	const parsedValues =
		createRentalOfferWithCreatedRatePlanFormSchema.parse(values);
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
