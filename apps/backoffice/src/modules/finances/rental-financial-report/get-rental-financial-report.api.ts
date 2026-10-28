import {
	type GetRentalFinancialReportQueryDto,
	GetRentalFinancialReportQuerySchema,
	type GetRentalFinancialReportResponseDto,
	GetRentalFinancialReportResponseSchema,
	getRentalFinancialReportContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getRentalFinancialReport(
	input: GetRentalFinancialReportQueryDto,
	signal?: AbortSignal,
): Promise<GetRentalFinancialReportResponseDto> {
	const query = GetRentalFinancialReportQuerySchema.parse(input);
	const params = new URLSearchParams({ year: String(query.year) });
	const response = await apiFetch(
		`${getRentalFinancialReportContract.path}?${params}`,
		{
			method: getRentalFinancialReportContract.method,
			signal,
		},
	);
	return GetRentalFinancialReportResponseSchema.parse(response);
}
