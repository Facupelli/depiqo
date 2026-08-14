import { serverEnv } from "@/config/server-env";
import { BACKEND_PROXY_PREFIX } from "./backend-api-url";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const HOP_BY_HOP_HEADERS = new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
]);
const INTERNAL_REQUEST_HEADERS = new Set([
	"forwarded",
	"host",
	"x-internal-token",
	"x-storefront-tenant-context",
	"x-tenant-id",
]);
const BROWSER_CONTEXT_HEADERS = new Set(["origin", "referer"]);
const INTERNAL_RESPONSE_HEADERS = new Set(["server", "via", "x-powered-by"]);
const RESPONSE_HEADERS_TO_REBUILD = new Set(["set-cookie"]);
const BODYLESS_RESPONSE_STATUSES = new Set([101, 204, 205, 304]);

type MultiValueHeaders = Headers & {
	getAll?: (name: string) => string[];
	getSetCookie?: () => string[];
};

type StreamingRequestInit = RequestInit & {
	duplex?: "half";
};

export async function proxyBackendRequest(
	request: Request,
	splat: string,
): Promise<Response> {
	const requestId = crypto.randomUUID();
	const originError = validateRequestOrigin(request);

	if (originError) {
		return problemResponse(403, "Forbidden", originError, requestId);
	}

	const upstreamUrl = createUpstreamUrl(request.url, splat);
	const headers = createUpstreamRequestHeaders(request.headers, requestId);
	const controller = new AbortController();
	let timedOut = false;
	const timeout = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, serverEnv.BACKEND_PROXY_TIMEOUT_MS);
	const abortOnDisconnect = () => controller.abort();
	request.signal.addEventListener("abort", abortOnDisconnect, { once: true });

	const init: StreamingRequestInit = {
		method: request.method,
		headers,
		body: canHaveRequestBody(request.method) ? request.body : undefined,
		redirect: "manual",
		signal: controller.signal,
	};

	if (request.body) {
		init.duplex = "half";
	}

	try {
		const upstreamResponse = await fetch(upstreamUrl, init);
		return createProxyResponse(request, upstreamUrl, upstreamResponse);
	} catch (error) {
		const status = timedOut ? 504 : 502;
		const title = timedOut ? "Backend Timeout" : "Backend Unavailable";

		console.error("[backend-proxy] upstream request failed", {
			requestId,
			method: request.method,
			status,
			errorName: error instanceof Error ? error.name : "UnknownError",
		});

		return problemResponse(
			status,
			title,
			timedOut
				? "The backend did not respond before the proxy timeout."
				: "The proxy could not reach the backend.",
			requestId,
		);
	} finally {
		clearTimeout(timeout);
		request.signal.removeEventListener("abort", abortOnDisconnect);
	}
}

function validateRequestOrigin(request: Request): string | null {
	if (!UNSAFE_METHODS.has(request.method.toUpperCase())) {
		return null;
	}

	const origin = request.headers.get("origin");
	if (!origin) {
		return "State-changing browser requests must include an Origin header.";
	}

	let parsedOrigin: URL;
	try {
		parsedOrigin = new URL(origin);
	} catch {
		return "The request Origin header is invalid.";
	}

	if (parsedOrigin.origin !== new URL(request.url).origin) {
		return "Cross-origin state-changing requests are not allowed.";
	}

	return null;
}

function createUpstreamUrl(requestUrl: string, splat: string): URL {
	const incomingUrl = new URL(requestUrl);
	const upstreamUrl = new URL(`/${splat}`, serverEnv.BACKEND_URL);
	upstreamUrl.search = incomingUrl.search;
	return upstreamUrl;
}

function createUpstreamRequestHeaders(
	incomingHeaders: Headers,
	requestId: string,
): Headers {
	const headers = new Headers();

	for (const [name, value] of incomingHeaders) {
		const normalizedName = name.toLowerCase();

		// Origin is validated at this same-origin boundary. It is not forwarded
		// because NestJS CORS configuration should not govern server-to-server I/O.
		if (
			HOP_BY_HOP_HEADERS.has(normalizedName) ||
			INTERNAL_REQUEST_HEADERS.has(normalizedName) ||
			BROWSER_CONTEXT_HEADERS.has(normalizedName) ||
			normalizedName === "content-length" ||
			normalizedName.startsWith("cf-") ||
			normalizedName.startsWith("sec-fetch-") ||
			normalizedName.startsWith("x-forwarded-")
		) {
			continue;
		}

		headers.append(name, value);
	}

	headers.set("x-request-id", requestId);
	return headers;
}

function createProxyResponse(
	request: Request,
	upstreamUrl: URL,
	upstreamResponse: Response,
): Response {
	const headers = new Headers();

	for (const [name, value] of upstreamResponse.headers) {
		const normalizedName = name.toLowerCase();

		if (
			HOP_BY_HOP_HEADERS.has(normalizedName) ||
			INTERNAL_RESPONSE_HEADERS.has(normalizedName) ||
			RESPONSE_HEADERS_TO_REBUILD.has(normalizedName) ||
			normalizedName.startsWith("access-control-") ||
			normalizedName.startsWith("cf-") ||
			normalizedName.startsWith("x-envoy-") ||
			normalizedName.startsWith("x-forwarded-")
		) {
			continue;
		}

		headers.append(name, value);
	}

	for (const cookie of getSetCookieHeaders(upstreamResponse.headers)) {
		headers.append("Set-Cookie", cookie);
	}

	const location = upstreamResponse.headers.get("location");
	if (location) {
		headers.set("location", rewriteBackendLocation(location, upstreamUrl));
	}

	const body =
		request.method.toUpperCase() === "HEAD" ||
		BODYLESS_RESPONSE_STATUSES.has(upstreamResponse.status)
			? null
			: upstreamResponse.body;

	return new Response(body, {
		status: upstreamResponse.status,
		statusText: upstreamResponse.statusText,
		headers,
	});
}

function getSetCookieHeaders(headers: Headers): string[] {
	const multiValueHeaders = headers as MultiValueHeaders;

	if (typeof multiValueHeaders.getAll === "function") {
		return multiValueHeaders.getAll("Set-Cookie");
	}

	if (typeof multiValueHeaders.getSetCookie === "function") {
		return multiValueHeaders.getSetCookie();
	}

	const cookie = headers.get("set-cookie");
	return cookie ? [cookie] : [];
}

function rewriteBackendLocation(location: string, upstreamUrl: URL): string {
	let redirectUrl: URL;

	try {
		redirectUrl = new URL(location, upstreamUrl);
	} catch {
		return location;
	}

	const backendOrigin = new URL(serverEnv.BACKEND_URL).origin;
	if (redirectUrl.origin !== backendOrigin) {
		return location;
	}

	return `${BACKEND_PROXY_PREFIX}${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
}

function canHaveRequestBody(method: string): boolean {
	const normalizedMethod = method.toUpperCase();
	return normalizedMethod !== "GET" && normalizedMethod !== "HEAD";
}

function problemResponse(
	status: number,
	title: string,
	detail: string,
	requestId: string,
): Response {
	return Response.json(
		{
			type: "about:blank",
			title,
			status,
			detail,
		},
		{
			status,
			headers: {
				"Cache-Control": "no-store",
				"X-Request-Id": requestId,
			},
		},
	);
}
