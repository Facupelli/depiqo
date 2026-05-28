import {
	type CreateRatePlanAndAttachToRentalOfferBodyDto,
	CreateRatePlanAndAttachToRentalOfferBodySchema,
} from "@repo/api-contracts";
import {
	type CreateRatePlanBaseFormValues,
	createRatePlanBaseFormDefaultValues,
	createRatePlanBaseFormSchema,
} from "../../create-rate-plan/create-rate-plan.schema";

export const createRatePlanAndAttachToRentalOfferFormSchema =
	createRatePlanBaseFormSchema;

export type CreateRatePlanAndAttachToRentalOfferFormValues =
	CreateRatePlanBaseFormValues;

export function createRatePlanAndAttachToRentalOfferFormDefaultValues(): CreateRatePlanAndAttachToRentalOfferFormValues {
	return createRatePlanBaseFormDefaultValues();
}

export function toCreateRatePlanAndAttachToRentalOfferDto(
	values: CreateRatePlanAndAttachToRentalOfferFormValues,
	context: { catalogRentalOfferId: string },
): CreateRatePlanAndAttachToRentalOfferBodyDto {
	const dto = {
		catalogRentalOfferId: context.catalogRentalOfferId.trim(),
		name: values.name.trim(),
		billingUnit: values.billingUnit,
		currency: values.currency.trim().toUpperCase(),
		tiers: values.tiers.map((tier) => ({
			fromUnit: tier.fromUnit,
			toUnit: tier.toUnit,
			pricePerUnit: tier.pricePerUnit.trim(),
		})),
	};

	return CreateRatePlanAndAttachToRentalOfferBodySchema.parse(dto);
}
