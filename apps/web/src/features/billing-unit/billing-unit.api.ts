import type { BillingUnitListResponse } from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import { authenticatedApiFetch as apiFetch } from "@/lib/api-auth";

const apiUrl = "/billing-units";

export const getBillingUnits = createServerFn({ method: "GET" }).handler(
	async (): Promise<BillingUnitListResponse> => {
		const result = await apiFetch<BillingUnitListResponse>(apiUrl, {
			method: "GET",
		});

		return result;
	},
);
