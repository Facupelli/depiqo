import {
	type GetRentalCustomersQueryDto,
	GetRentalCustomersQuerySchema,
	type GetRentalCustomersResponseDto,
	GetRentalCustomersResponseSchema,
	getRentalCustomersContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getRentalCustomers(
	query?: GetRentalCustomersQueryDto,
): Promise<GetRentalCustomersResponseDto> {
	const parsedQuery = GetRentalCustomersQuerySchema.parse(query ?? {});
	const searchParams = new URLSearchParams();

	if (parsedQuery.status !== undefined) {
		searchParams.set("status", parsedQuery.status);
	}

	if (parsedQuery.isActive !== undefined) {
		searchParams.set("isActive", String(parsedQuery.isActive));
	}

	if (parsedQuery.search !== undefined) {
		searchParams.set("search", parsedQuery.search);
	}

	searchParams.set("page", String(parsedQuery.page));
	searchParams.set("pageSize", String(parsedQuery.pageSize));

	const path = `${getRentalCustomersContract.path}?${searchParams.toString()}`;

	const response = await apiFetch(path, {
		method: getRentalCustomersContract.method,
	});

	return GetRentalCustomersResponseSchema.parse(response);
}
