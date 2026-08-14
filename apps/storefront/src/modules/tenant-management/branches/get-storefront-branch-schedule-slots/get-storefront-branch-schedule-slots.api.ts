import {
	type GetStorefrontBranchScheduleSlotsQueryDto,
	GetStorefrontBranchScheduleSlotsQuerySchema,
	type GetStorefrontBranchScheduleSlotsResponseDto,
	GetStorefrontBranchScheduleSlotsResponseSchema,
	getStorefrontBranchScheduleSlotsContract,
} from "@repo/api-contracts";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import { storefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";

export async function getStorefrontBranchScheduleSlots(
	requestContext: StorefrontRequestContext,
	branchId: string,
	query: GetStorefrontBranchScheduleSlotsQueryDto,
): Promise<GetStorefrontBranchScheduleSlotsResponseDto> {
	const parsedQuery = GetStorefrontBranchScheduleSlotsQuerySchema.parse(query);
	const path = getStorefrontBranchScheduleSlotsContract.path.replace(
		":branchId",
		encodeURIComponent(branchId),
	) as `/storefront/${string}`;

	const response = await storefrontApiFetch(requestContext, {
		path,
		method: getStorefrontBranchScheduleSlotsContract.method,
		query: parsedQuery,
	});

	return GetStorefrontBranchScheduleSlotsResponseSchema.parse(response);
}
