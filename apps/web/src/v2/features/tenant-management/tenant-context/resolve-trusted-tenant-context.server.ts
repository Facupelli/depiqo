import { getRequestHeader } from "@tanstack/react-start/server";
import type { TrustedTenantContext } from "./types";

const BACKEND_URL = process.env.BACKEND_URL;
const BFF_INTERNAL_TOKEN = process.env.BFF_INTERNAL_TOKEN;

export async function resolveTrustedTenantContextFromRequest(): Promise<{
	data: TrustedTenantContext;
}> {
	const hostname = getTrustedRequestHostname();

	if (!BACKEND_URL) {
		throw new Error("Missing BACKEND_URL");
	}

	if (!BFF_INTERNAL_TOKEN) {
		throw new Error("Missing BFF_INTERNAL_TOKEN");
	}

	const url = new URL("/v2/internal/tenant-context/resolve", BACKEND_URL);
	url.searchParams.set("hostname", hostname);

	const response = await fetch(url, {
		method: "GET",
		headers: {
			"x-internal-token": BFF_INTERNAL_TOKEN,
		},
	});

	if (response.status === 404) {
		throw new TenantContextNotFoundError(hostname);
	}

	if (!response.ok) {
		throw new Error(`Failed to resolve tenant context: ${response.status}`);
	}

	return response.json() as Promise<{ data: TrustedTenantContext }>;
}

function getTrustedRequestHostname(): string {
	const host = getRequestHeader("host");

	if (!host) {
		throw new Error("Missing request host");
	}

	return new URL(`http://${host}`).hostname;
}

export class TenantContextNotFoundError extends Error {
	readonly isTenantContextNotFound = true;

	constructor(hostname: string) {
		super(`No tenant context found for hostname: ${hostname}`);
	}
}
