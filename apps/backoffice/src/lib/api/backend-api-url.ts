export const BACKEND_PROXY_PREFIX = "/backend";

export function getBackendApiBaseUrl(): string {
	if (typeof window !== "undefined") {
		return BACKEND_PROXY_PREFIX;
	}

	const backendUrl = process.env.BACKEND_URL;
	if (!backendUrl) {
		throw new Error("Missing BACKEND_URL");
	}

	return backendUrl.replace(/\/$/, "");
}
