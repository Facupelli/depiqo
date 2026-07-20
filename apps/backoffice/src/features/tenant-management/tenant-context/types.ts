import {
	PublicTenantContextSchema,
	type PublicStorefrontTenantContext,
	type PublicTenantContext,
	type TrustedTenantContext,
} from "@repo/api-contracts";

export type {
	PublicStorefrontTenantContext,
	PublicTenantContext,
	TrustedTenantContext,
};

export function toPublicTenantContext(
	context: TrustedTenantContext,
): PublicTenantContext {
	if (context.face === "platform") {
		return PublicTenantContextSchema.parse({ face: "platform" });
	}

	if (context.face === "admin") {
		return PublicTenantContextSchema.parse({ face: "admin" });
	}

	return PublicTenantContextSchema.parse({
		face: "storefront",
		tenant: {
			slug: context.publicTenant.slug,
			name: context.publicTenant.name,
			customDomain: context.publicTenant.customDomain,
			logoUrl: context.publicTenant.logoUrl,
			faviconUrl: context.publicTenant.faviconUrl,
			primaryColor: context.publicTenant.primaryColor,
		},
	});
}
