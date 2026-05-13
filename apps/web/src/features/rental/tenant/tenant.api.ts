import type { TenantRentalConfig } from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import { portalTenantMiddleware } from "@/features/tenant-context/portal-tenant.middleware";
import { storefrontApiFetch } from "@/lib/storefront-api";

const apiUrl = "/tenant";

export const getTenantRentalConfig = createServerFn({ method: "GET" })
	.middleware([portalTenantMiddleware])
	.handler(async ({ context }): Promise<TenantRentalConfig> => {
		const result = await storefrontApiFetch<TenantRentalConfig>(
			context.tenantId,
			`${apiUrl}/${context.tenantId}/pricing-config`,
			{
				method: "GET",
			},
		);

		return result;
	});
