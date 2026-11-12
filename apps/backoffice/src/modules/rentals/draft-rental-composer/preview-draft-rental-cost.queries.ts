import type { PreviewDraftRentalCostBodyDto } from "@repo/api-contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { previewDraftRentalCost } from "./preview-draft-rental-cost.api";

export function draftRentalCostPreviewOptions(
	body: PreviewDraftRentalCostBodyDto | null,
) {
	return queryOptions({
		queryKey: ["v2", "rentals", "draft-cost-preview", body],
		queryFn: ({ signal }) => {
			if (!body) throw new Error("A complete proposal is required.");
			return previewDraftRentalCost(body, signal);
		},
		enabled: body !== null,
		// Never show a previous proposal's totals under changed inputs.
		placeholderData: undefined,
		staleTime: 0,
		retry: false,
	});
}

export function useDraftRentalCostPreview(
	body: PreviewDraftRentalCostBodyDto | null,
) {
	return useQuery(draftRentalCostPreviewOptions(body));
}
