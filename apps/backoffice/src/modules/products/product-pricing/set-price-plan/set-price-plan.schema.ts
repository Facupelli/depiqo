import {
	type AttachRatePlanToRentalOfferBodyDto,
	AttachRatePlanToRentalOfferBodySchema,
} from "@repo/api-contracts";
import type { PricePlanSelectionFormValues } from "../price-plan-selection/price-plan-selection.schema";

export function toAttachRatePlanToRentalOfferDto(
	values: PricePlanSelectionFormValues,
	context: { catalogRentalOfferId: string },
): AttachRatePlanToRentalOfferBodyDto {
	const dto = {
		catalogRentalOfferId: context.catalogRentalOfferId.trim(),
		ratePlanId: values.ratePlanId.trim(),
	};

	return AttachRatePlanToRentalOfferBodySchema.parse(dto);
}
