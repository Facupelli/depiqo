import {
	type GetRentalOperationsQueryDto,
	GetRentalOperationsQuerySchema,
	type GetRentalOperationsResponseDto,
	GetRentalOperationsResponseSchema,
	getRentalOperationsContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getRentalOperations(
	query: GetRentalOperationsQueryDto,
): Promise<GetRentalOperationsResponseDto> {
	const parsedQuery = GetRentalOperationsQuerySchema.parse(query);
	const searchParams = new URLSearchParams({
		branchId: parsedQuery.branchId,
		from: parsedQuery.from,
		to: parsedQuery.to,
	});
	const response = await apiFetch(
		`${getRentalOperationsContract.path}?${searchParams.toString()}`,
		{ method: getRentalOperationsContract.method },
	);

	return GetRentalOperationsResponseSchema.parse(response);
}
