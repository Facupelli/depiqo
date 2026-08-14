import {
	GetRentalContractSigningSummaryParamsSchema,
	type GetRentalContractSigningSummaryResponseDto,
	GetRentalContractSigningSummaryResponseSchema,
	getRentalContractSigningSummaryContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getRentalContractSigningSummary(
	rentalId: string,
): Promise<GetRentalContractSigningSummaryResponseDto> {
	const parsedParams = GetRentalContractSigningSummaryParamsSchema.parse({
		rentalId,
	});
	const path = getRentalContractSigningSummaryContract.path.replace(
		":rentalId",
		encodeURIComponent(parsedParams.rentalId),
	);

	const response = await apiFetch(path, {
		method: getRentalContractSigningSummaryContract.method,
	});

	return GetRentalContractSigningSummaryResponseSchema.parse(response);
}
