import {
	type UpdateRentalOfferVisibilityAndRentabilityBodyDto,
	UpdateRentalOfferVisibilityAndRentabilityBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const editBranchAvailabilityFormSchema = z.object({
	showInStore: z.boolean(),
	isRentable: z.boolean(),
});

export type EditBranchAvailabilityFormValues = z.infer<
	typeof editBranchAvailabilityFormSchema
>;

export function editBranchAvailabilityFormDefaultValues(
	values: EditBranchAvailabilityFormValues,
): EditBranchAvailabilityFormValues {
	return {
		showInStore: values.showInStore,
		isRentable: values.isRentable,
	};
}

export function toUpdateRentalOfferVisibilityAndRentabilityDto(
	values: EditBranchAvailabilityFormValues,
	original: EditBranchAvailabilityFormValues,
): UpdateRentalOfferVisibilityAndRentabilityBodyDto {
	const parsedValues = editBranchAvailabilityFormSchema.parse(values);

	return UpdateRentalOfferVisibilityAndRentabilityBodySchema.parse({
		...(parsedValues.showInStore !== original.showInStore
			? { showInStore: parsedValues.showInStore }
			: {}),
		...(parsedValues.isRentable !== original.isRentable
			? { isRentable: parsedValues.isRentable }
			: {}),
	});
}
