import type { TenantPricingConfig, TenantRentalConfig } from "@repo/schemas";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { usePortalTenantId } from "@/features/tenant-context/use-portal-tenant-id";
import { getTenantRentalConfig } from "./tenant.api";

// -------------------------------------------------------
// Key Factory
// -------------------------------------------------------

export const rentalTenantKeys = {
	all: (tenantId: string) => ["tenant-rental-config", tenantId] as const,
	me: (tenantId: string) => [...rentalTenantKeys.all(tenantId), "me"] as const,
};

export const rentalTenantQueries = {
	me: (tenantId?: string) =>
		queryOptions<TenantRentalConfig>({
			queryKey: rentalTenantKeys.me(tenantId ?? "current"),
			queryFn: () => getTenantRentalConfig(),
			staleTime: 5 * 60 * 1000,
		}),
};

// -------------------------------------------------------
// Hooks
// -------------------------------------------------------

export function useTenantRentalConfig() {
	const tenantId = usePortalTenantId();

	return useSuspenseQuery(rentalTenantQueries.me(tenantId));
}

export function useTenantPricingConfig(): { data: TenantPricingConfig } {
	const { data } = useTenantRentalConfig();

	return {
		data: data.pricing,
	};
}
