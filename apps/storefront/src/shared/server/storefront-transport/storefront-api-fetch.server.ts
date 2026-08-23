import {
	problemDetailsSchema,
	STOREFRONT_TENANT_CONTEXT_HEADER_NAME,
	type TrustedTenantContext,
} from "@repo/api-contracts";
import { createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerEnvironment } from "@/config/server-env";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import {
	resolveTrustedTenantContext,
	TenantResolverFailure,
} from "@/modules/tenant-management/resolve-public-tenant-context/resolve-trusted-tenant-context.server";
import { logStorefrontServerEvent } from "@/shared/server/logging/storefront-server-logger.server";
import { signStorefrontTenantToken } from "./sign-storefront-tenant-token.server";
import { StorefrontTransportError } from "./storefront-transport.error";

type StorefrontApiQueryValue =
	| string
	| number
	| boolean
	| readonly (string | number | boolean)[]
	| null
	| undefined;

export type StorefrontApiFetchOptions = Omit<RequestInit, "body"> & {
	path: string;
	body?: unknown;
	query?: Record<string, StorefrontApiQueryValue>;
};

const responseEnvelopeSchema = z.object({ data: z.unknown() });

export const storefrontApiFetch = createServerOnlyFn(
	async <T>(
		requestContext: StorefrontRequestContext,
		options: StorefrontApiFetchOptions,
	): Promise<T | null> => {
		const startedAt = Date.now();
		let trustedContext: TrustedTenantContext;

		try {
			trustedContext = await resolveTrustedTenantContext(requestContext);
		} catch (error) {
			if (error instanceof TenantResolverFailure) {
				throw new StorefrontTransportError({
					type: "about:blank",
					title: error.kind === "unknown-host" ? "Not Found" : "Bad Request",
					status: error.status,
					detail: "The request does not resolve to an available storefront.",
					requestId: requestContext.requestId,
				});
			}

			throw error;
		}

		if (trustedContext.face !== "storefront") {
			throw new StorefrontTransportError({
				type: "about:blank",
				title: "Not Found",
				status: 404,
				detail: "This operation is only available on a storefront hostname.",
				requestId: requestContext.requestId,
			});
		}

		const environment = getServerEnvironment();
		const method = (options.method ?? "GET").toUpperCase();
		const url = buildStorefrontApiUrl(
			environment.BACKEND_URL,
			options.path,
			options.query,
		);
		const headers = new Headers(options.headers);
		const token = await signStorefrontTenantToken(trustedContext);

		headers.set(STOREFRONT_TENANT_CONTEXT_HEADER_NAME, token);
		headers.set("x-request-id", requestContext.requestId);

		if (options.body !== undefined && !headers.has("content-type")) {
			headers.set("content-type", "application/json");
		}

		let response: Response;

		try {
			response = await fetch(url, {
				...options,
				method,
				headers,
				body: serializeRequestBody(options.body),
				credentials: undefined,
			});
		} catch {
			logTransport(
				requestContext,
				method,
				options.path,
				startedAt,
				503,
				"network-error",
			);
			throw new StorefrontTransportError({
				type: "about:blank",
				title: "Backend Unavailable",
				status: 503,
				detail: "The storefront service could not reach the backend.",
				requestId: requestContext.requestId,
			});
		}

		if (!response.ok) {
			logTransport(
				requestContext,
				method,
				options.path,
				startedAt,
				response.status,
				"backend-error",
			);
			const rawProblem = await response.json().catch(() => null);
			const parsedProblem = problemDetailsSchema.safeParse(rawProblem);

			throw new StorefrontTransportError(
				parsedProblem.success
					? parsedProblem.data
					: {
							type: "about:blank",
							title: "Request Failed",
							status: response.status,
							detail: "The backend rejected the storefront request.",
							requestId: requestContext.requestId,
						},
			);
		}

		logTransport(
			requestContext,
			method,
			options.path,
			startedAt,
			response.status,
		);

		if (response.status === 204) {
			return null;
		}

		const envelope = responseEnvelopeSchema.safeParse(
			await response.json().catch(() => null),
		);

		if (!envelope.success) {
			throw new StorefrontTransportError({
				type: "about:blank",
				title: "Invalid Backend Response",
				status: 502,
				detail: "The backend returned an invalid response.",
				requestId: requestContext.requestId,
			});
		}

		return envelope.data.data as T;
	},
);

function buildStorefrontApiUrl(
	backendOrigin: string,
	path: string,
	query?: Record<string, StorefrontApiQueryValue>,
): URL {
	if (!path.startsWith("/") || path.startsWith("//")) {
		throw new Error(
			"Storefront API paths must be relative to the backend origin",
		);
	}

	const url = new URL(path, backendOrigin);

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

	return url;
}

function serializeRequestBody(body: unknown): BodyInit | undefined {
	if (body === undefined) {
		return undefined;
	}

	if (
		typeof body === "string" ||
		body instanceof FormData ||
		body instanceof Blob ||
		body instanceof ArrayBuffer ||
		body instanceof URLSearchParams ||
		body instanceof ReadableStream
	) {
		return body;
	}

	return JSON.stringify(body);
}

function logTransport(
	requestContext: StorefrontRequestContext,
	method: string,
	path: string,
	startedAt: number,
	status: number,
	reason?: string,
): void {
	logStorefrontServerEvent({
		event: "storefront.backend-request.completed",
		requestId: requestContext.requestId,
		hostname: requestContext.hostname,
		method,
		path,
		status,
		durationMs: Date.now() - startedAt,
		reason,
	});
}
