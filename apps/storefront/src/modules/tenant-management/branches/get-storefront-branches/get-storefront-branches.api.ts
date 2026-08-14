import {
	type GetStorefrontBranchesResponseDto,
	GetStorefrontBranchesResponseSchema,
	getStorefrontBranchesContract,
} from "@repo/api-contracts";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import { storefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";

export async function getStorefrontBranches(
	requestContext: StorefrontRequestContext,
): Promise<GetStorefrontBranchesResponseDto> {
	const response = await storefrontApiFetch(requestContext, {
		path: getStorefrontBranchesContract.path as `/storefront/${string}`,
		method: getStorefrontBranchesContract.method,
	});

	return GetStorefrontBranchesResponseSchema.parse(response);
}
