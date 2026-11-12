import {
	ConfirmRentalParamsSchema,
	GetRentalConfirmationSummaryResponseSchema,
	getRentalConfirmationSummaryContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getRentalConfirmationSummary(
	rentalId: string,
	signal?: AbortSignal,
) {
	const params = ConfirmRentalParamsSchema.parse({ rentalId });
	return GetRentalConfirmationSummaryResponseSchema.parse(
		await apiFetch(
			getRentalConfirmationSummaryContract.path.replace(
				":rentalId",
				encodeURIComponent(params.rentalId),
			),
			{ method: getRentalConfirmationSummaryContract.method, signal },
		),
	);
}
