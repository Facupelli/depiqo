import type { ResolvedTenantContext } from "@repo/schemas";
import { getRequestUrl } from "@tanstack/react-start/server";

function getHostname(): string {
	const url = new URL(getRequestUrl());
	return url.hostname; // strips port automatically — handles localhost:3000 in dev
}

function getRequiredEnv(
	name: "BACKEND_URL" | "INTERNAL_API_TOKEN" | "ROOT_DOMAIN",
): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`${name} is not set`);
	}

	return value;
}

function buildCacheKey(hostname: string, rootDomain: string): string {
	// Use the real Worker hostname per Cloudflare's recommendation.
	return `https://${rootDomain}/cache/tenant-context/${hostname}`;
}

async function readFromCache(
	cacheKey: string,
): Promise<ResolvedTenantContext | null> {
	if (typeof caches === "undefined") {
		return null;
	}

	const cache = await caches.open("tenant-context");
	const cached = await cache.match(cacheKey);

	if (!cached) {
		return null;
	}

	return cached.json() as Promise<ResolvedTenantContext>;
}

async function writeToCache(
	cacheKey: string,
	context: ResolvedTenantContext,
): Promise<void> {
	if (typeof caches === "undefined") {
		return;
	}

	const cache = await caches.open("tenant-context");
	await cache.put(
		cacheKey,
		Response.json(context, {
			headers: { "Cache-Control": "max-age=60" },
		}),
	);
}

export async function resolveTenantContextByHostname(): Promise<ResolvedTenantContext> {
	const nestApiUrl = getRequiredEnv("BACKEND_URL");
	const internalToken = getRequiredEnv("INTERNAL_API_TOKEN");
	const rootDomain = getRequiredEnv("ROOT_DOMAIN");

	const hostname = getHostname();
	const cacheKey = buildCacheKey(hostname, rootDomain);

	const cached = await readFromCache(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const response = await fetch(
			`${nestApiUrl}/internal/tenant-context?hostname=${encodeURIComponent(hostname)}`,
			{
				headers: {
					"x-internal-token": internalToken,
				},
			},
		);

		if (response.status === 404) {
			throw { isNotFound: true };
		}

		if (!response.ok) {
			throw new Error(
				`Tenant context resolution failed: ${response.status} ${response.statusText}`,
			);
		}

		const body = (await response.json()) as { data: ResolvedTenantContext };
		const context = body.data;

		await writeToCache(cacheKey, context);

		return context;
	} catch (error) {
		console.log(
			"TENANT CONTEXT RESOLUTION ERROR:",
			error instanceof Error ? error.message : String(error),
			"hostname:",
			hostname,
		);
		throw error;
	}
}
