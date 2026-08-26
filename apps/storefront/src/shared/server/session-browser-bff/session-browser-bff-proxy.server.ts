import {
	STOREFRONT_TENANT_CONTEXT_HEADER_NAME,
	type TrustedTenantContext,
} from "@repo/api-contracts";
import { getServerEnvironment } from "@/config/server-env";
import { requiresCanonicalStorefrontRedirect } from "@/modules/tenant-management/resolve-public-tenant-context/canonical-storefront-host";
import { normalizeRequestHostname } from "@/modules/tenant-management/resolve-public-tenant-context/hostname";
import {
	resolveTrustedTenantContext,
	TenantResolverFailure,
} from "@/modules/tenant-management/resolve-public-tenant-context/resolve-trusted-tenant-context.server";
import { signStorefrontTenantToken } from "@/shared/server/storefront-transport/sign-storefront-tenant-token.server";

const ALLOWED_PATHS = new Set([
	"auth/csrf",
	"auth/customer/login",
	"auth/customer/google/finalize",
	"auth/customer/logout",
	"auth/customer/me",
	"tenant-management/rental-customers/me/profile",
	"tenant-management/customer/profile/submit",
	"rental-commitments/confirmed-rentals",
]);
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const BODYLESS_STATUSES = new Set([101, 204, 205, 304]);

type MultiValueHeaders = Headers & {
	getAll?: (name: string) => string[];
	getSetCookie?: () => string[];
};

type StreamingRequestInit = RequestInit & { duplex?: "half" };

export async function proxySessionBrowserBffRequest(
	request: Request,
	splat: string,
): Promise<Response> {
	const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
	if (!ALLOWED_PATHS.has(splat))
		return problemResponse(404, "Not Found", requestId);

	const incomingUrl = new URL(request.url);
	if (UNSAFE_METHODS.has(request.method.toUpperCase())) {
		const origin = request.headers.get("origin");
		if (!origin || origin !== incomingUrl.origin) {
			return problemResponse(
				403,
				"Cross-origin requests are not allowed",
				requestId,
			);
		}
	}

	const hostname = normalizeRequestHostname(request.headers.get("host"));
	if (!hostname.success)
		return problemResponse(400, "Invalid storefront host", requestId);

	let tenantContext: TrustedTenantContext;
	try {
		tenantContext = await resolveTrustedTenantContext({
			hostname: hostname.hostname,
			requestId,
		});
	} catch (error) {
		if (error instanceof TenantResolverFailure) {
			return problemResponse(
				error.status,
				error.kind === "invalid-host"
					? "Invalid storefront host"
					: "Storefront tenant not found",
				requestId,
			);
		}

		return problemResponse(503, "Tenant resolver unavailable", requestId);
	}

	if (tenantContext.face !== "storefront") {
		return problemResponse(404, "Storefront tenant not found", requestId);
	}

	if (requiresCanonicalStorefrontRedirect(tenantContext)) {
		const location = new URL(request.url);
		location.hostname = tenantContext.canonicalHost;
		location.port = "";
		return new Response(null, {
			status: 308,
			headers: {
				location: location.toString(),
				"cache-control": "no-store",
				"x-request-id": requestId,
			},
		});
	}

	const token = await signStorefrontTenantToken(tenantContext);
	const upstreamUrl = new URL(`/${splat}`, getServerEnvironment().BACKEND_URL);
	upstreamUrl.search = incomingUrl.search;
	const headers = new Headers();

	for (const name of [
		"accept",
		"content-type",
		"cookie",
		"x-csrf-token",
		"user-agent",
		"idempotency-key",
	]) {
		const value = request.headers.get(name);
		if (value) headers.set(name, value);
	}
	headers.set(STOREFRONT_TENANT_CONTEXT_HEADER_NAME, token);
	headers.set("x-request-id", requestId);

	const init: StreamingRequestInit = {
		method: request.method,
		headers,
		body: canHaveBody(request.method) ? request.body : undefined,
		redirect: "manual",
	};
	if (request.body) init.duplex = "half";

	let upstream: Response;
	try {
		upstream = await fetch(upstreamUrl, init);
	} catch {
		return problemResponse(502, "Backend unavailable", requestId);
	}

	const responseHeaders = new Headers();
	for (const name of [
		"cache-control",
		"content-type",
		"location",
		"x-request-id",
	]) {
		const value = upstream.headers.get(name);
		if (value) responseHeaders.set(name, value);
	}
	for (const cookie of getSetCookieHeaders(upstream.headers)) {
		responseHeaders.append("set-cookie", cookie);
	}

	return new Response(
		request.method === "HEAD" || BODYLESS_STATUSES.has(upstream.status)
			? null
			: upstream.body,
		{
			status: upstream.status,
			statusText: upstream.statusText,
			headers: responseHeaders,
		},
	);
}

function getSetCookieHeaders(headers: Headers): string[] {
	const multi = headers as MultiValueHeaders;
	if (typeof multi.getAll === "function") return multi.getAll("set-cookie");
	if (typeof multi.getSetCookie === "function") return multi.getSetCookie();
	const cookie = headers.get("set-cookie");
	return cookie ? [cookie] : [];
}

function canHaveBody(method: string): boolean {
	return !["GET", "HEAD"].includes(method.toUpperCase());
}

function problemResponse(
	status: number,
	detail: string,
	requestId: string,
): Response {
	return Response.json(
		{ type: "about:blank", title: detail, status, detail, requestId },
		{
			status,
			headers: { "cache-control": "no-store", "x-request-id": requestId },
		},
	);
}
