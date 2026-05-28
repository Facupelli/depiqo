import {
	type GetBranchesQueryDto,
	GetBranchesQuerySchema,
	type GetBranchesResponseDto,
	GetBranchesResponseSchema,
	getBranchesContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function getBranches(
	query?: GetBranchesQueryDto,
): Promise<GetBranchesResponseDto> {
	const parsedQuery = GetBranchesQuerySchema.parse(query ?? {});
	const searchParams = new URLSearchParams();

	if (parsedQuery.isActive !== undefined) {
		searchParams.set("isActive", String(parsedQuery.isActive));
	}

	const path = searchParams.size
		? `${getBranchesContract.path}?${searchParams.toString()}`
		: getBranchesContract.path;

	const response = await apiFetch(path, {
		method: getBranchesContract.method,
	});

	return GetBranchesResponseSchema.parse(response);
}
