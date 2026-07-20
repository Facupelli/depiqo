import { buildR2PublicUrl } from "@/lib/r2-public-url";
import type {
	PublicStorefrontTenantContext,
	PublicTenantContext,
} from "./types";

export interface TenantBranding {
	tenantName: string;
	logoSrc: string | null;
	faviconHref: string | null;
}

export function getTenantBranding(
	tenant: PublicStorefrontTenantContext,
): TenantBranding {
	return {
		tenantName: tenant.name,
		logoSrc: buildR2PublicUrl(tenant.logoUrl, "branding"),
		faviconHref: buildR2PublicUrl(tenant.faviconUrl, "branding"),
	};
}

export function getResolvedTenantBranding(
	tenantContext: PublicTenantContext,
): TenantBranding | null {
	if (tenantContext.face !== "storefront") {
		return null;
	}

	return getTenantBranding(tenantContext.tenant);
}
