import {
	type GetStorefrontBranchSchedulesResponseDto,
	GetStorefrontBranchSchedulesResponseSchema,
	getStorefrontBranchSchedulesContract,
} from "@repo/api-contracts";
import { storefrontApiFetch } from "@/lib/api/storefront-api-fetch";

export async function getStorefrontBranchSchedules(
	branchId: string,
): Promise<GetStorefrontBranchSchedulesResponseDto> {
	const path = getStorefrontBranchSchedulesContract.path.replace(
		":branchId",
		encodeURIComponent(branchId),
	) as `/storefront/${string}`;

	const response = await storefrontApiFetch({
		path,
		method: getStorefrontBranchSchedulesContract.method,
	});

	return GetStorefrontBranchSchedulesResponseSchema.parse(response);
}
