import {
	type GetRentalsQueryDto,
	GetRentalsQuerySchema,
	type GetRentalsResponseDto,
	GetRentalsResponseSchema,
	getRentalsContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function getRentals(
	query?: GetRentalsQueryDto,
): Promise<GetRentalsResponseDto> {
	const parsedQuery = GetRentalsQuerySchema.parse(query ?? {});
	const searchParams = new URLSearchParams();

	if (parsedQuery.branchId !== undefined) {
		searchParams.set("branchId", parsedQuery.branchId);
	}

	if (parsedQuery.customerId !== undefined) {
		searchParams.set("customerId", parsedQuery.customerId);
	}

	if (parsedQuery.statuses !== undefined) {
		searchParams.set("statuses", parsedQuery.statuses.join(","));
	}

	if (parsedQuery.dateLens !== undefined) {
		searchParams.set("dateLens", parsedQuery.dateLens);
	}

	if (parsedQuery.sortBy !== undefined) {
		searchParams.set("sortBy", parsedQuery.sortBy);
	}

	if (parsedQuery.sortDirection !== undefined) {
		searchParams.set("sortDirection", parsedQuery.sortDirection);
	}

	searchParams.set("page", String(parsedQuery.page));
	searchParams.set("limit", String(parsedQuery.limit));

	const path = `${getRentalsContract.path}?${searchParams.toString()}`;
	const response = await apiFetch(path, {
		method: getRentalsContract.method,
	});

	return GetRentalsResponseSchema.parse(response);
}
