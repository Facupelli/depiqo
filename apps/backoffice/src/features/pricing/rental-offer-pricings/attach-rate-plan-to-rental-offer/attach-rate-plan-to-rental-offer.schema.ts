import {
	type AttachRatePlanToRentalOfferBodyDto,
	AttachRatePlanToRentalOfferBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const attachRatePlanToRentalOfferFormSchema = z.object({
	ratePlanId: z.string().trim().min(1, "El plan de tarifa es obligatorio"),
});

export type AttachRatePlanToRentalOfferFormValues = z.infer<
	typeof attachRatePlanToRentalOfferFormSchema
>;

export function attachRatePlanToRentalOfferFormDefaultValues(): AttachRatePlanToRentalOfferFormValues {
	return {
		ratePlanId: "",
	};
}

export function toAttachRatePlanToRentalOfferDto(
	values: AttachRatePlanToRentalOfferFormValues,
	context: { catalogRentalOfferId: string },
): AttachRatePlanToRentalOfferBodyDto {
	const dto = {
		catalogRentalOfferId: context.catalogRentalOfferId.trim(),
		ratePlanId: values.ratePlanId.trim(),
	};

	return AttachRatePlanToRentalOfferBodySchema.parse(dto);
}
