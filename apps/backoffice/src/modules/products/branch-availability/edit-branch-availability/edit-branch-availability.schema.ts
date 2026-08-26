import {
	type UpdateRentalOfferVisibilityAndRentabilityBodyDto,
	UpdateRentalOfferVisibilityAndRentabilityBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const editBranchAvailabilityFormSchema = z.object({
	isVisible: z.boolean(),
	isRentable: z.boolean(),
});

export type EditBranchAvailabilityFormValues = z.infer<
	typeof editBranchAvailabilityFormSchema
>;

export function editBranchAvailabilityFormDefaultValues(
	values: EditBranchAvailabilityFormValues,
): EditBranchAvailabilityFormValues {
	return {
		isVisible: values.isVisible,
		isRentable: values.isRentable,
	};
}

export function toUpdateRentalOfferVisibilityAndRentabilityDto(
	values: EditBranchAvailabilityFormValues,
): UpdateRentalOfferVisibilityAndRentabilityBodyDto {
	const parsedValues = editBranchAvailabilityFormSchema.parse(values);

	return UpdateRentalOfferVisibilityAndRentabilityBodySchema.parse(
		parsedValues,
	);
}
