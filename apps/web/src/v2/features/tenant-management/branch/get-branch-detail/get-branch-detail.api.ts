import {
	GetBranchDetailParamsSchema,
	type GetBranchDetailResponseDto,
	GetBranchDetailResponseSchema,
	getBranchDetailContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function getBranchDetail(
	branchId: string,
): Promise<GetBranchDetailResponseDto> {
	const parsedParams = GetBranchDetailParamsSchema.parse({ branchId });
	const path = getBranchDetailContract.path.replace(
		":branchId",
		encodeURIComponent(parsedParams.branchId),
	);

	const response = await apiFetch(path, {
		method: getBranchDetailContract.method,
	});

	return GetBranchDetailResponseSchema.parse(response);
}
