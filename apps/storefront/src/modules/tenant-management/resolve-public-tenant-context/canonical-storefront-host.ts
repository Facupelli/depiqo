import type { TrustedTenantContext } from "@repo/api-contracts";

type StorefrontTenantContext = Extract<
	TrustedTenantContext,
	{ face: "storefront" }
>;

export function isLocalStorefrontHostname(hostname: string): boolean {
	return hostname === "localhost" || hostname.endsWith(".localhost");
}

export function requiresCanonicalStorefrontRedirect(
	context: StorefrontTenantContext,
): boolean {
	return (
		context.host !== context.canonicalHost &&
		!isLocalStorefrontHostname(context.host)
	);
}

export function getStorefrontReturnHost(
	context: StorefrontTenantContext,
): string | undefined {
	return isLocalStorefrontHostname(context.host) ? context.host : undefined;
}
