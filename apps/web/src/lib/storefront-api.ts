import type { PaginatedDto } from "@repo/schemas";
import { serverEnv } from "@/config/server-env";
import { type ApiRequestOptions, requestJson } from "./api";

type StorefrontApiRequestOptions = ApiRequestOptions;

function getStorefrontHeaders(tenantId: string): Record<string, string> {
	return {
		"x-internal-token": serverEnv.INTERNAL_API_TOKEN,
		"x-tenant-id": tenantId,
	};
}

async function storefrontApiFetchRaw<T>(
	tenantId: string,
	path: string,
	options: StorefrontApiRequestOptions,
): Promise<T> {
	const storefrontHeaders = getStorefrontHeaders(tenantId);

	return requestJson<T>(path, {
		...options,
		headers: {
			...options.headers,
			...storefrontHeaders,
		},
	});
}

export async function storefrontApiFetch<T>(
	tenantId: string,
	path: string,
	options: StorefrontApiRequestOptions,
): Promise<T> {
	const body = await storefrontApiFetchRaw<{ data: T }>(
		tenantId,
		path,
		options,
	);
	return body?.data;
}

export async function storefrontApiFetchPaginated<T>(
	tenantId: string,
	path: string,
	options: StorefrontApiRequestOptions,
): Promise<PaginatedDto<T>> {
	return storefrontApiFetchRaw<PaginatedDto<T>>(tenantId, path, options);
}
