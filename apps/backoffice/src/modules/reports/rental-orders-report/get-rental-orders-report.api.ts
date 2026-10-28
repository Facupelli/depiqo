import {
	type GetRentalOrdersReportQueryDto,
	type GetRentalOrdersReportResponseDto,
	getRentalOrdersReportContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";
import { getReportSearchParams, normalizeReportQuery } from "../report-filters";

export async function getRentalOrdersReport(
	input: GetRentalOrdersReportQueryDto,
	signal?: AbortSignal,
): Promise<GetRentalOrdersReportResponseDto> {
	const query = normalizeReportQuery(
		getRentalOrdersReportContract.query.parse(input),
	);
	const params = getReportSearchParams(query);
	params.set("invoicePresence", query.invoicePresence);
	const response = await apiFetch(
		`${getRentalOrdersReportContract.path}?${params}`,
		{ method: getRentalOrdersReportContract.method, signal },
	);
	return getRentalOrdersReportContract.response.parse(response);
}
