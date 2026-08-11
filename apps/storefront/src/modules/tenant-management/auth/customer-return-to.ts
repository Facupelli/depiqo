export const CUSTOMER_AUTH_FALLBACK_PATH = "/rental";

const DISALLOWED_RETURN_PATHS = new Set(["/login", "/register"]);
const LOCAL_ORIGIN = "https://storefront.invalid";

export function resolveCustomerReturnTo(value: unknown): string {
	if (typeof value !== "string" || !value.startsWith("/")) {
		return CUSTOMER_AUTH_FALLBACK_PATH;
	}

	if (value.startsWith("//") || value.includes("\\")) {
		return CUSTOMER_AUTH_FALLBACK_PATH;
	}

	try {
		const url = new URL(value, LOCAL_ORIGIN);
		if (url.origin !== LOCAL_ORIGIN || DISALLOWED_RETURN_PATHS.has(url.pathname)) {
			return CUSTOMER_AUTH_FALLBACK_PATH;
		}

		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return CUSTOMER_AUTH_FALLBACK_PATH;
	}
}
