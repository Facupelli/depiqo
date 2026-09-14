import {
	type UpdateDraftRentalBodyDto,
	UpdateDraftRentalBodySchema,
} from "@repo/api-contracts";
import {
	buildDraftRentalPeriod,
	type DraftRentalComposerFormValues,
	emptyDraftRentalValueToUndefined,
	toDraftRentalManualPricingAdjustment,
	toDraftRentalSelectedOffers,
} from "../draft-rental-composer/draft-rental-composer.schema";
import type { UpdateDraftRentalVariables } from "./update-draft-rental.api";

type UpdateDraftRentalMappingContext = {
	rentalId: string;
	expectedVersion: number;
	timezone: string;
};

export function toUpdateDraftRentalVariables(
	values: DraftRentalComposerFormValues,
	context: UpdateDraftRentalMappingContext,
): UpdateDraftRentalVariables {
	let deliveryIntent: UpdateDraftRentalBodyDto["deliveryIntent"];

	if (values.fulfillmentMethod === "DELIVERY") {
		switch (values.deliveryDestination.status) {
			case "EXISTING":
				deliveryIntent = { type: "KEEP_CURRENT" };
				break;
			case "NEW_DESTINATION":
				deliveryIntent = {
					type: "NEW_DESTINATION",
					address: values.deliveryDestination.address.trim(),
					locationId: values.deliveryDestination.locationId.trim(),
				};
				break;
			case "INVALID":
				throw new Error("Delivery requires a valid destination");
		}
	}

	const body = {
		expectedVersion: context.expectedVersion,
		branchId: values.branchId,
		rentalCustomerId: emptyDraftRentalValueToUndefined(values.rentalCustomerId),
		period: buildDraftRentalPeriod(values, context.timezone),
		selectedOffers: toDraftRentalSelectedOffers(values),
		fulfillmentMethod: values.fulfillmentMethod,
		insuranceSelected: values.insuranceSelected,
		manualPricingAdjustment: toDraftRentalManualPricingAdjustment(values),
		deliveryIntent,
	};

	return {
		rentalId: context.rentalId,
		body: UpdateDraftRentalBodySchema.parse(body),
	};
}
