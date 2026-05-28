import { problemDetailsSchema } from "@repo/schemas";
import { ProblemDetailsError } from "@/shared/errors";
import { resolveTrustedTenantContextFromRequest } from "@/v2/features/tenant-management/tenant-context/resolve-trusted-tenant-context.server";
import { signStorefrontTenantToken } from "@/v2/features/tenant-management/tenant-context/sign-storefront-tenant-token.server";

const SERVER_API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

const STOREFRONT_TENANT_CONTEXT_HEADER_NAME = "x-storefront-tenant-context";

type StorefrontApiPath = `/${string}`;

type StorefrontApiFetchQueryValue =
	| string
	| number
	| boolean
	| readonly (string | number | boolean)[]
	| null
	| undefined;

type StorefrontApiFetchOptions = Omit<RequestInit, "body"> & {
	path: StorefrontApiPath;
	body?: unknown;
	query?: Record<string, StorefrontApiFetchQueryValue>;
};

export async function storefrontApiFetch<T = unknown>(
	options: StorefrontApiFetchOptions,
): Promise<T | null> {
	const trustedTenantContext = await resolveTrustedTenantContextFromRequest();

	if (trustedTenantContext.data.face !== "storefront") {
		throw new ProblemDetailsError({
			type: "about:blank",
			title: "Invalid Storefront Context",
			status: 404,
			detail: "This route is not available outside a storefront hostname.",
		});
	}

	const tenantContextToken = await signStorefrontTenantToken(
		trustedTenantContext.data,
	);

	const method = (options.method ?? "GET").toUpperCase();
	const headers = new Headers(options.headers);

	headers.set(STOREFRONT_TENANT_CONTEXT_HEADER_NAME, tenantContextToken);

	if (options.body !== undefined && !headers.has("content-type")) {
		headers.set("content-type", "application/json");
	}

	let response: Response;

	try {
		response = await fetch(buildStorefrontApiUrl(options.path, options.query), {
			...options,
			method,
			headers,
			body:
				options.body === undefined
					? undefined
					: typeof options.body === "string" ||
							options.body instanceof FormData ||
							options.body instanceof Blob ||
							options.body instanceof ArrayBuffer
						? options.body
						: JSON.stringify(options.body),
			credentials: undefined,
		});
	} catch (error) {
		throw new ProblemDetailsError({
			type: "about:blank",
			title: "Network Error",
			status: 0,
			detail:
				error instanceof Error
					? error.message
					: "An unexpected network error occurred",
		});
	}

	if (!response.ok) {
		const raw = await response.json().catch(() => null);
		const parsed = problemDetailsSchema.safeParse(raw);

		throw new ProblemDetailsError(
			parsed.success
				? parsed.data
				: {
						type: "about:blank",
						title: response.statusText || "Request Failed",
						status: response.status,
						detail: `Request to ${options.path} failed with status ${response.status}`,
					},
		);
	}

	if (response.status === 204) {
		return null;
	}

	const data = (await response.json()) as { data: T };
	return data.data;
}

function buildStorefrontApiUrl(
	path: StorefrontApiPath,
	query?: StorefrontApiFetchOptions["query"],
): string {
	const url = new URL(path, SERVER_API_BASE_URL);

	for (const [key, value] of Object.entries(query ?? {})) {
		if (value === null || value === undefined) {
			continue;
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				url.searchParams.append(key, String(item));
			}
			continue;
		}

		url.searchParams.set(key, String(value));
	}

	return url.toString();
}
