import { hydrateRentalPeriod } from "@/modules/rentals/shared/rental-period/rental-period";
import type { RentalCustomerDisplayFacts } from "../customer-selection/rental-customer-selector";
import type { DraftRentalBranchDisplayFacts } from "../draft-rental-composer/draft-rental-composer";
import type { DraftRentalComposerFormValues } from "../draft-rental-composer/draft-rental-composer.schema";
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

	return {
		defaultValues: {
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
			deliveryDestination:
				rental.fulfillment.method === "DELIVERY" && deliveryDetails
					? {
							status: "EXISTING",
							address: deliveryDetails.formattedAddress,
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
