import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { normalizeRequestHostname } from "@/modules/tenant-management/resolve-public-tenant-context/hostname";
import type { StorefrontApiFetchOptions } from "@/shared/server/storefront-transport/storefront-api-fetch.server";
import { storefrontApiFetch as trustedStorefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";

const REQUEST_ID_HEADER = "x-request-id";

export async function storefrontApiFetch<T>(
	options: StorefrontApiFetchOptions,
): Promise<T | null> {
	const hostname = normalizeRequestHostname(getRequestHeader("host") ?? null);
	if (!hostname.success)
		throw new Error("Storefront request Host header is unavailable");

	const requestId = getRequestHeader(REQUEST_ID_HEADER) ?? crypto.randomUUID();
	setResponseHeader(REQUEST_ID_HEADER, requestId);
	return trustedStorefrontApiFetch<T>(
		{ hostname: hostname.hostname, requestId },
		options,
	);
}
