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

export function getCurrentDraftRentalEquipmentPreview(
	values: DraftRentalDerivationValues,
	snapshot: DraftRentalCostPreviewSnapshot,
): Pick<PreviewDraftRentalCostResponseDto, "pricing" | "currency"> | undefined {
	const equipmentInputs = (input: DraftRentalDerivationValues) => ({
		branchId: input.branchId,
		rentalCustomerId: input.rentalCustomerId,
		periodStartDate: input.periodStartDate,
		periodStartTime: input.periodStartTime,
		periodEndDate: input.periodEndDate,
		periodEndTime: input.periodEndTime,
		selectedOffers: input.selectedOffers.map(({ rentalOfferId, quantity }) => ({
			rentalOfferId,
			quantity,
		})),
		insuranceSelected: input.insuranceSelected,
		targetTotal: input.targetTotal,
	});
	if (
		snapshot.query?.status !== "success" ||
		JSON.stringify(equipmentInputs(values)) !==
			JSON.stringify(equipmentInputs(snapshot.values))
	)
		return undefined;
	return snapshot.query.data;
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
	if (
		JSON.stringify(selectDraftRentalDerivationValues(values)) !==
		JSON.stringify(selectDraftRentalDerivationValues(snapshot.values))
	)
		return undefined;
	const delivery = query.data.delivery;
	if (
		values.fulfillmentMethod === "PICKUP"
			? delivery !== null
			: (delivery?.arrangement ?? query.data.pendingDelivery?.arrangement) !==
				values.deliveryArrangement
	)
		return undefined;
	return query.data;
}
