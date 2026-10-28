import {
	type GetEquipmentReservationsReportQueryDto,
	type GetEquipmentReservationsReportResponseDto,
	getEquipmentReservationsReportContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";
import { getReportSearchParams, normalizeReportQuery } from "../report-filters";

export async function getEquipmentReservationsReport(
	input: GetEquipmentReservationsReportQueryDto,
	signal?: AbortSignal,
): Promise<GetEquipmentReservationsReportResponseDto> {
	const query = normalizeReportQuery(
		getEquipmentReservationsReportContract.query.parse(input),
	);
	const params = getReportSearchParams(query);
	const response = await apiFetch(
		`${getEquipmentReservationsReportContract.path}?${params}`,
		{ method: getEquipmentReservationsReportContract.method, signal },
	);
	return getEquipmentReservationsReportContract.response.parse(response);
}
