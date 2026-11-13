import type { PreviewDraftRentalCostResponseDto } from "@repo/api-contracts";
import type { QueryState } from "@tanstack/react-query";
import type { DraftRentalDerivationValues } from "./draft-rental-composer.schema";

export type DraftRentalCostPreviewSnapshot = {
	values: DraftRentalDerivationValues;
	query:
		| Pick<
				QueryState<PreviewDraftRentalCostResponseDto>,
				"data" | "status" | "fetchStatus"
		  >
		| undefined;
};

// Shared projection keeps preview identity independent of submission-only reasons.
export function selectDraftRentalDerivationValues(
	values: DraftRentalDerivationValues,
): DraftRentalDerivationValues {
	return {
		branchId: values.branchId,
		rentalCustomerId: values.rentalCustomerId,
		periodStartDate: values.periodStartDate,
		periodStartTime: values.periodStartTime,
		periodEndDate: values.periodEndDate,
		periodEndTime: values.periodEndTime,
		selectedOffers: values.selectedOffers,
		deliveryArrangement: values.deliveryArrangement,
		fulfillmentMethod: values.fulfillmentMethod,
		deliveryDestination: values.deliveryDestination,
		insuranceSelected: values.insuranceSelected,
		targetTotal: values.targetTotal,
		deliveryAgreementDecision: values.deliveryAgreementDecision,
		deliveryAgreementAmount: values.deliveryAgreementAmount,
		transportReservationMinutes: values.transportReservationMinutes,
		deliveryExceptionAccepted: values.deliveryExceptionAccepted,
	};
}

export function getCurrentDraftRentalCostPreview(
	values: DraftRentalDerivationValues,
	snapshot: DraftRentalCostPreviewSnapshot,
): PreviewDraftRentalCostResponseDto | undefined {
	const query = snapshot.query;
	if (
		query?.status !== "success" ||
		query.fetchStatus !== "idle" ||
		!query.data
	)
		return undefined;
	// Form subscribers can observe new inputs before the parent publishes its next query snapshot.
	if (
		JSON.stringify(selectDraftRentalDerivationValues(values)) !==
		JSON.stringify(selectDraftRentalDerivationValues(snapshot.values))
	)
		return undefined;
	const delivery = query.data.delivery;
	if (
		values.fulfillmentMethod === "PICKUP"
			? delivery !== null
			: delivery?.arrangement !== values.deliveryArrangement
	)
		return undefined;
	return query.data;
}
