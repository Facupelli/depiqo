import {
	type GetRentalOrdersReportQueryDto,
	getRentalOrdersReportContract,
} from "@repo/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { normalizeReportQuery } from "../report-filters";
import {
	type ReportContext,
	reportKeys,
	retryReportQuery,
} from "../reports.queries";
import { getRentalOrdersReport } from "./get-rental-orders-report.api";

export const rentalOrdersReportQueries = {
	report: (input: GetRentalOrdersReportQueryDto, context: ReportContext) => {
		const query = normalizeReportQuery(
			getRentalOrdersReportContract.query.parse(input),
		);
		return queryOptions({
			queryKey: [...reportKeys.rentals(), context, query] as const,
			queryFn: ({ signal }) => getRentalOrdersReport(query, signal),
			staleTime: 30_000,
			retry: retryReportQuery,
		});
	},
};
