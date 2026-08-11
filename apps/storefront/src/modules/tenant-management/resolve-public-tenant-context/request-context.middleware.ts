import { createMiddleware } from "@tanstack/react-start";
import { logStorefrontServerEvent } from "@/shared/server/logging/storefront-server-logger.server";
import { getPublicSigningHostname } from "@/shared/server/public-signing-browser-bff/public-signing-host.server";
import { normalizeRequestHostname } from "./hostname";
import {
	resolveTrustedTenantContext,
	TenantResolverFailure,
} from "./resolve-trusted-tenant-context.server";

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export type StorefrontRequestContext = {
	hostname: string;
	requestId: string;
};

export const storefrontRequestContextMiddleware = createMiddleware().server(
	async ({ next, request }) => {
		const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
		const hostnameResult = normalizeRequestHostname(
			request.headers.get("host"),
		);

		if (!hostnameResult.success) {
			logStorefrontServerEvent({
				event: "storefront.request.rejected",
				requestId,
				status: 400,
				reason: hostnameResult.reason,
			});

			return Response.json(
				{
					type: "about:blank",
					title: "Bad Request",
					status: 400,
					detail: "The request Host header is missing or malformed.",
					requestId,
				},
				{
					status: 400,
					headers: {
						"cache-control": "no-store",
						[REQUEST_ID_HEADER]: requestId,
					},
				},
			);
		}

		const storefrontRequest = {
			hostname: hostnameResult.hostname,
			requestId,
		} satisfies StorefrontRequestContext;

		if (storefrontRequest.hostname === getPublicSigningHostname()) {
			if (!isPublicSigningPath(new URL(request.url).pathname)) {
				return tenantResolutionFailureResponse(
					new TenantResolverFailure("unknown-host", 404),
					requestId,
				);
			}

			const response = await next({ context: { storefrontRequest } });
			response.response.headers.set(REQUEST_ID_HEADER, requestId);
			return response;
		}

		try {
			const tenantContext =
				await resolveTrustedTenantContext(storefrontRequest);
			if (
				tenantContext.face === "storefront" &&
				tenantContext.host !== tenantContext.canonicalHost
			) {
				return redirectToCanonicalHost(
					request,
					tenantContext.canonicalHost,
					requestId,
				);
			}
		} catch (error) {
			if (error instanceof TenantResolverFailure) {
				return tenantResolutionFailureResponse(error, requestId);
			}

			throw error;
		}

		const response = await next({
			context: { storefrontRequest },
		});

		response.response.headers.set(REQUEST_ID_HEADER, requestId);
		return response;
	},
);

function redirectToCanonicalHost(
	request: Request,
	canonicalHost: string,
	requestId: string,
): Response {
	const location = new URL(request.url);
	location.hostname = canonicalHost;
	location.port = "";

	return new Response(null, {
		status: 308,
		headers: {
			location: location.toString(),
			"cache-control": "no-store",
			[REQUEST_ID_HEADER]: requestId,
		},
	});
}

function tenantResolutionFailureResponse(
	error: TenantResolverFailure,
	requestId: string,
): Response {
	return Response.json(
		{
			type: "about:blank",
			title: error.status === 400 ? "Bad Request" : "Not Found",
			status: error.status,
			detail:
				error.status === 400
					? "The request Host header is invalid."
					: "The storefront host is not available.",
			requestId,
		},
		{
			status: error.status,
			headers: {
				"cache-control": "no-store",
				[REQUEST_ID_HEADER]: requestId,
			},
		},
	);
}

function isPublicSigningPath(pathname: string): boolean {
	return (
		pathname === "/signing" ||
		pathname.startsWith("/public-signing/") ||
		pathname.startsWith("/assets/") ||
		pathname.startsWith("/_build/") ||
		pathname === "/favicon.svg"
	);
}

function resolveRequestId(value: string | null): string {
	return value && REQUEST_ID_PATTERN.test(value) ? value : crypto.randomUUID();
}
