import {
	type GetStorefrontBranchSchedulesResponseDto,
	GetStorefrontBranchSchedulesResponseSchema,
	getStorefrontBranchSchedulesContract,
} from "@repo/api-contracts";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import { storefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";

export async function getStorefrontBranchSchedules(
	requestContext: StorefrontRequestContext,
	branchId: string,
): Promise<GetStorefrontBranchSchedulesResponseDto> {
	const path = getStorefrontBranchSchedulesContract.path.replace(
		":branchId",
		encodeURIComponent(branchId),
	) as `/storefront/${string}`;

	const response = await storefrontApiFetch(requestContext, {
		path,
		method: getStorefrontBranchSchedulesContract.method,
	});

	return GetStorefrontBranchSchedulesResponseSchema.parse(response);
}
