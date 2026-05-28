import {
	type SyncTenantBillingUnitsDto,
	syncTenantBillingUnitsSchema,
	type TenantBillingUnitListResponse,
} from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import { authenticatedApiFetch as apiFetch } from "@/lib/api-auth";

const apiUrl = "/tenants/billing-units";

export const getTenantBillingUnits = createServerFn({ method: "GET" }).handler(
	async (): Promise<TenantBillingUnitListResponse> => {
		const result = await apiFetch<TenantBillingUnitListResponse>(apiUrl, {
			method: "GET",
		});

		return result;
	},
);

export const createTenantBillingUnit = createServerFn({ method: "POST" })
	.inputValidator((data: SyncTenantBillingUnitsDto) =>
		syncTenantBillingUnitsSchema.parse(data),
	)
	.handler(async ({ data }): Promise<string> => {
		const result = await apiFetch<string>(apiUrl, {
			method: "POST",
			body: data,
		});

		return result;
	});
