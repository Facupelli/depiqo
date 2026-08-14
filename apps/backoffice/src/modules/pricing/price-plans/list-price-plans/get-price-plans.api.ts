import {
	type GetRatePlansQueryDto,
	GetRatePlansQuerySchema,
	type GetRatePlansResponseDto,
	GetRatePlansResponseSchema,
	getRatePlansContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getPricePlans(
	query?: GetRatePlansQueryDto,
): Promise<GetRatePlansResponseDto> {
	const parsedQuery = GetRatePlansQuerySchema.parse(query ?? {});
	const searchParams = new URLSearchParams();

	if (parsedQuery.isActive !== undefined) {
		searchParams.set("isActive", String(parsedQuery.isActive));
	}

	const queryString = searchParams.toString();
	const response = await apiFetch(
		`${getRatePlansContract.path}${queryString ? `?${queryString}` : ""}`,
		{ method: getRatePlansContract.method },
	);

	return GetRatePlansResponseSchema.parse(response);
}
