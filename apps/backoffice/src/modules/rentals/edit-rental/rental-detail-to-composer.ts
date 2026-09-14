import dayjs from "@/lib/dates/dayjs";
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
	const start = toLocalPeriodEndpoint(rental.period.start, operationalTimezone);
	const end = toLocalPeriodEndpoint(rental.period.end, operationalTimezone);
	const manualAdjustment = rental.pricing?.manualPricingAdjustment;
	const deliveryDetails = rental.fulfillment.deliveryDetails;

	return {
		defaultValues: {
			branchId: rental.branchId,
			rentalCustomerId: rental.customerId ?? "",
			periodStartDate: start.date,
			periodStartTime: start.minuteOfDay,
			periodEndDate: end.date,
			periodEndTime: end.minuteOfDay,
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

function toLocalPeriodEndpoint(instant: string, timezone: string) {
	const local = dayjs(instant).tz(timezone);

	return {
		date: local.format("YYYY-MM-DD"),
		minuteOfDay: local.hour() * 60 + local.minute(),
	};
}
