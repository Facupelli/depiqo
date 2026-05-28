import {
	type GetRentalsCalendarQueryDto,
	GetRentalsCalendarQuerySchema,
	type GetRentalsCalendarResponseDto,
	GetRentalsCalendarResponseSchema,
	getRentalsCalendarContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function getRentalsCalendar(
	query: GetRentalsCalendarQueryDto,
): Promise<GetRentalsCalendarResponseDto> {
	const parsedQuery = GetRentalsCalendarQuerySchema.parse(query);
	const searchParams = new URLSearchParams({
		branchId: parsedQuery.branchId,
		from: parsedQuery.from.toISOString(),
		to: parsedQuery.to.toISOString(),
	});

	const response = await apiFetch(
		`${getRentalsCalendarContract.path}?${searchParams.toString()}`,
		{
			method: getRentalsCalendarContract.method,
		},
	);

	return GetRentalsCalendarResponseSchema.parse(response);
}
