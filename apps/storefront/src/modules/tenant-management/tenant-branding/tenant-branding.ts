import type { PublicTenantContext } from "@repo/api-contracts";
import { buildR2PublicUrl } from "@/lib/r2-public-url";

export interface TenantBranding {
	tenantName: string;
	logoSrc: string | null;
	faviconHref: string | null;
}

type StorefrontTenant = Extract<
	PublicTenantContext,
	{ face: "storefront" }
>["tenant"];

export function getTenantBranding(tenant: StorefrontTenant): TenantBranding {
	return {
		tenantName: tenant.name,
		logoSrc: buildR2PublicUrl(tenant.logoUrl, "branding"),
		faviconHref: buildR2PublicUrl(tenant.faviconUrl, "branding"),
	};
}

export function getResolvedTenantBranding(
	tenantContext: PublicTenantContext,
): TenantBranding | null {
	return tenantContext.face === "storefront"
		? getTenantBranding(tenantContext.tenant)
		: null;
}
