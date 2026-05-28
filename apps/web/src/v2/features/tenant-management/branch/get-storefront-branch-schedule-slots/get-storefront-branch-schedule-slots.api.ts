import {
	type GetStorefrontBranchScheduleSlotsQueryDto,
	GetStorefrontBranchScheduleSlotsQuerySchema,
	type GetStorefrontBranchScheduleSlotsResponseDto,
	GetStorefrontBranchScheduleSlotsResponseSchema,
	getStorefrontBranchScheduleSlotsContract,
} from "@repo/api-contracts";
import { storefrontApiFetch } from "@/v2/lib/api/storefront-api-fetch";

export async function getStorefrontBranchScheduleSlots(
	branchId: string,
	query: GetStorefrontBranchScheduleSlotsQueryDto,
): Promise<GetStorefrontBranchScheduleSlotsResponseDto> {
	const parsedQuery = GetStorefrontBranchScheduleSlotsQuerySchema.parse(query);
	const path = getStorefrontBranchScheduleSlotsContract.path.replace(
		":branchId",
		encodeURIComponent(branchId),
	) as `/storefront/${string}`;

	const response = await storefrontApiFetch({
		path,
		method: getStorefrontBranchScheduleSlotsContract.method,
		query: parsedQuery,
	});

	return GetStorefrontBranchScheduleSlotsResponseSchema.parse(response);
}
