import { hydrateRentalPeriod } from "@/modules/rentals/shared/rental-period/rental-period";
import type { RentalCustomerDisplayFacts } from "../customer-selection/rental-customer-selector";
import type { DraftRentalBranchDisplayFacts } from "../draft-rental-composer/draft-rental-composer";
import {
	createDraftRentalComposerDefaultValues,
	type DraftRentalComposerFormValues,
} from "../draft-rental-composer/draft-rental-composer.schema";
import type { GetRentalDetailViewResponseDto } from "../rental-detail/get-rental-detail-view/get-rental-detail-view.schema";

export type HydratedDraftRentalEditor = {
	defaultValues: DraftRentalComposerFormValues;
	initialBranch: DraftRentalBranchDisplayFacts;
	initialCustomer?: RentalCustomerDisplayFacts;
	expectedVersion: number;
};

export function hydrateRentalDetailToComposer(
	rental: GetRentalDetailViewResponseDto,
	operationalTimezone: string,
): HydratedDraftRentalEditor {
	const period = hydrateRentalPeriod(
		rental.period.start,
		rental.period.end,
		operationalTimezone,
	);
	const manualAdjustment = rental.pricing?.manualPricingAdjustment;
	const deliveryDetails = rental.fulfillment.deliveryDetails;
	const delivery = rental.draftDelivery;
	const arrangement = delivery?.arrangement ?? "ROUTED";

	return {
		defaultValues: {
			...createDraftRentalComposerDefaultValues(),
			branchId: rental.branchId,
			rentalCustomerId: rental.customerId ?? "",
			periodStartDate: period.startDate,
			periodStartTime: period.startTime,
			periodEndDate: period.endDate,
			periodEndTime: period.endTime,
			selectedOffers: rental.selections.map((selection) => ({
				rentalOfferId: selection.rentalOfferId,
				name: selection.rentableItemName,
				quantity: selection.quantity,
				availableCount: null,
			})),
			fulfillmentMethod: rental.fulfillment.method,
			deliveryArrangement: arrangement,
			deliveryAgreementAmount: delivery?.staffAgreement?.amount ?? "",
			deliveryAgreementReason: delivery?.staffAgreement?.reason ?? "",
			transportReservationMinutes:
				arrangement === "STAFF_ARRANGED" && delivery
					? String(delivery.transportReservationMinutes)
					: "",
			deliveryDestination:
				rental.fulfillment.method === "DELIVERY" && deliveryDetails
					? {
							status: "EXISTING",
							address:
								arrangement === "STAFF_ARRANGED"
									? deliveryDetails.address
									: (deliveryDetails.formattedAddress ??
										deliveryDetails.address),
						}
					: { status: "INVALID", address: "" },
			insuranceSelected: rental.insuranceSelected,
			targetTotal: manualAdjustment?.targetTotal ?? "",
			adjustmentReason: manualAdjustment?.reason ?? "",
		},
		initialBranch: rental.retainedBranch,
		initialCustomer: rental.retainedCustomer ?? undefined,
		expectedVersion: rental.version,
	};
}
