import type {
	PreviewDraftRentalCostBodyDto,
	PreviewDraftRentalCostResponseDto,
} from "@repo/api-contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { previewDraftRentalCost } from "./preview-draft-rental-cost.api";

export function draftRentalCostPreviewOptions(
	body: PreviewDraftRentalCostBodyDto | null,
) {
	return queryOptions({
		queryKey: ["v2", "rentals", "draft-cost-preview", body] as const,
		queryFn: ({ signal }) => {
			if (!body) throw new Error("A complete proposal is required.");
			return previewDraftRentalCost(body, signal);
		},
		enabled: body !== null,
		placeholderData: (previousData, previousQuery) => {
			const previousBody = previousQuery?.queryKey[3];
			if (
				!body ||
				!previousBody ||
				!previousData ||
				JSON.stringify(equipmentPricingInputs(body)) !==
					JSON.stringify(equipmentPricingInputs(previousBody))
			)
				return undefined;
			return {
				pricing: previousData.pricing,
				currency: previousData.currency,
				delivery: null,
				customerTotal: null,
			} satisfies PreviewDraftRentalCostResponseDto;
		},
		staleTime: 0,
		retry: false,
	});
}

function equipmentPricingInputs(body: PreviewDraftRentalCostBodyDto) {
	return {
		rentalId: body.rentalId,
		branchId: body.branchId,
		rentalCustomerId: body.rentalCustomerId,
		period: body.period,
		selectedOffers: body.selectedOffers,
		insuranceSelected: body.insuranceSelected,
		targetTotalAdjustment: body.targetTotalAdjustment,
	};
}

export function useDraftRentalCostPreview(
	body: PreviewDraftRentalCostBodyDto | null,
) {
	return useQuery(draftRentalCostPreviewOptions(body));
}
