import {
	type GetPublicTenantConfigResponseDto,
	GetPublicTenantConfigResponseSchema,
	getPublicTenantConfigContract,
} from "@repo/api-contracts";
import { storefrontApiFetch } from "@/v2/lib/api/storefront-api-fetch";

export async function getPublicTenantConfig(): Promise<GetPublicTenantConfigResponseDto> {
	const response = await storefrontApiFetch({
		path: getPublicTenantConfigContract.path,
		method: getPublicTenantConfigContract.method,
	});

	return GetPublicTenantConfigResponseSchema.parse(response);
}
