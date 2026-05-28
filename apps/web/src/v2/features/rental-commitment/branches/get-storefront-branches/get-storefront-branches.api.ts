import {
	type GetStorefrontBranchesResponseDto,
	GetStorefrontBranchesResponseSchema,
	getStorefrontBranchesContract,
} from "@repo/api-contracts";
import { storefrontApiFetch } from "@/v2/lib/api/storefront-api-fetch";

export async function getStorefrontBranches(): Promise<GetStorefrontBranchesResponseDto> {
	const response = await storefrontApiFetch({
		path: getStorefrontBranchesContract.path as `/storefront/${string}`,
		method: getStorefrontBranchesContract.method,
	});

	return GetStorefrontBranchesResponseSchema.parse(response);
}
