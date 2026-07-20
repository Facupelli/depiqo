import {
	type GetPublicTenantConfigResponseDto,
	GetPublicTenantConfigResponseSchema,
	getPublicTenantConfigContract,
} from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { storefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";

export const getPublicTenantConfig = createServerFn({ method: "GET" })
	.middleware([storefrontFunctionRequestContextMiddleware])
	.handler(async ({ context }): Promise<GetPublicTenantConfigResponseDto> => {
		const response = await storefrontApiFetch<unknown>(
			context.storefrontRequest,
			{
				path: getPublicTenantConfigContract.path,
				method: getPublicTenantConfigContract.method,
			},
		);

		return GetPublicTenantConfigResponseSchema.parse(response);
	});
