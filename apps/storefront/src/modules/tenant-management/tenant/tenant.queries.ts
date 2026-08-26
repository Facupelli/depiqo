import type { GetPublicTenantConfigResponseDto } from "@repo/api-contracts";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPublicTenantConfig } from "@/modules/tenant-management/get-public-tenant-config/get-public-tenant-config.function";

export const publicTenantConfigKeys = {
	all: () => ["storefront", "tenant-config"] as const,
	detail: () => [...publicTenantConfigKeys.all(), "detail"] as const,
};

export const publicTenantConfigQueries = {
	detail: () =>
		queryOptions<GetPublicTenantConfigResponseDto>({
			queryKey: publicTenantConfigKeys.detail(),
			queryFn: () => getPublicTenantConfig(),
		}),
};

export function usePublicTenantConfig() {
	return useSuspenseQuery(publicTenantConfigQueries.detail());
}
