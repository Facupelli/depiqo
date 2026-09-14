import {
	type CreateDraftRentalBodyDto,
	CreateDraftRentalBodySchema,
} from "@repo/api-contracts";
import {
	buildDraftRentalPeriod,
	type DraftRentalComposerFormValues,
	emptyDraftRentalValueToUndefined,
	toDraftRentalManualPricingAdjustment,
	toDraftRentalSelectedOffers,
} from "../draft-rental-composer/draft-rental-composer.schema";

export function toCreateDraftRentalDto(
	values: DraftRentalComposerFormValues,
	timezone: string,
): CreateDraftRentalBodyDto {
	let deliveryDetailsDto: CreateDraftRentalBodyDto["deliveryDetails"];

	if (values.fulfillmentMethod === "DELIVERY") {
		const address = values.deliveryDetails.address.trim();
		const locationId = values.deliveryDetails.locationId?.trim();

		if (!address || !locationId) {
			throw new Error("Delivery requires a complete selected address");
		}

		deliveryDetailsDto = {
			address,
			locationId,
		};
	}

	const dto = {
		branchId: values.branchId,
		rentalCustomerId: emptyDraftRentalValueToUndefined(values.rentalCustomerId),
		period: buildDraftRentalPeriod(values, timezone),
		selectedOffers: toDraftRentalSelectedOffers(values),
		fulfillmentMethod: values.fulfillmentMethod,
		deliveryDetails: deliveryDetailsDto,
		insuranceSelected: values.insuranceSelected,
		manualPricingAdjustment: toDraftRentalManualPricingAdjustment(values),
	};

	CreateDraftRentalBodySchema.parse(dto);

	return dto;
}
