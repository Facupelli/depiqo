import {
	type GetEquipmentReservationsReportQueryDto,
	getEquipmentReservationsReportContract,
} from "@repo/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { normalizeReportQuery } from "../report-filters";
import {
	type ReportContext,
	reportKeys,
	retryReportQuery,
} from "../reports.queries";
import { getEquipmentReservationsReport } from "./get-equipment-reservations-report.api";

export const equipmentReservationsReportQueries = {
	report: (
		input: GetEquipmentReservationsReportQueryDto,
		context: ReportContext,
	) => {
		const query = normalizeReportQuery(
			getEquipmentReservationsReportContract.query.parse(input),
		);
		return queryOptions({
			queryKey: [...reportKeys.equipment(), context, query] as const,
			queryFn: ({ signal }) => getEquipmentReservationsReport(query, signal),
			staleTime: 30_000,
			retry: retryReportQuery,
		});
	},
};
