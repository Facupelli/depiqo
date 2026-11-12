import {
	type PreviewDraftRentalCostBodyDto,
	PreviewDraftRentalCostBodySchema,
	PreviewDraftRentalCostResponseSchema,
	previewDraftRentalCostContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";
import { getCsrfToken } from "@/lib/api/csrf-token";

export async function previewDraftRentalCost(
	body: PreviewDraftRentalCostBodyDto,
	signal?: AbortSignal,
) {
	return PreviewDraftRentalCostResponseSchema.parse(
		await apiFetch(previewDraftRentalCostContract.path, {
			method: previewDraftRentalCostContract.method,
			headers: {
				"Content-Type": "application/json",
				...(typeof window !== "undefined"
					? { "x-csrf-token": await getCsrfToken() }
					: {}),
			},
			body: JSON.stringify(PreviewDraftRentalCostBodySchema.parse(body)),
			signal,
		}),
	);
}
