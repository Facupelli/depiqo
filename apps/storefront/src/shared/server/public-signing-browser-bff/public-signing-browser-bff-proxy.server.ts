import { getCsrfTokenContract } from "@repo/api-contracts";
import { getServerEnvironment } from "@/config/server-env";
import { PublicSigningTokenSchema } from "@/modules/document-signing/public-signing-token";
import { getPublicSigningHostname } from "./public-signing-host.server";

const CSRF_SESSION_COOKIE_NAME = "__Host-depiqo-signing-csrf-session";
const BACKEND_SESSION_COOKIE_NAME = "sid";
const BODYLESS_STATUSES = new Set([101, 204, 205, 304]);

const OPERATIONS = {
	"document-signing/public/sessions/me": { method: "GET" },
	"document-signing/public/sessions/me/accept": { method: "POST" },
	csrf: { method: "GET" },
} as const;

type PublicSigningOperation = keyof typeof OPERATIONS;
type StreamingRequestInit = RequestInit & { duplex?: "half" };
type MultiValueHeaders = Headers & {
	getAll?: (name: string) => string[];
	getSetCookie?: () => string[];
};

export async function proxyPublicSigningBrowserBffRequest(
	request: Request,
	splat: string,
): Promise<Response> {
	const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
	const hostname = request.headers.get("host")?.split(":", 1)[0]?.toLowerCase();

	if (hostname !== getPublicSigningHostname()) {
		return problemResponse(
			404,
			"Not Found",
			"Public signing is unavailable.",
			requestId,
		);
	}

	if (!isPublicSigningOperation(splat, request.method)) {
		return problemResponse(
			404,
			"Not Found",
			"Public signing operation not found.",
			requestId,
		);
	}

	if (request.method === "POST" && !hasSameOrigin(request)) {
		return problemResponse(
			403,
			"Forbidden",
			"Cross-origin state-changing requests are not allowed.",
			requestId,
		);
	}

	if (splat === "csrf") return bootstrapCsrfSession(requestId);

	const token = getSigningToken(request.headers.get("authorization"));
	if (!token) {
		return problemResponse(
			400,
			"Malformed signing token",
			"Authorization must contain a valid Bearer signing token.",
			requestId,
		);
	}

	const upstreamUrl = new URL(`/${splat}`, getServerEnvironment().BACKEND_URL);
	const headers = new Headers({
		accept: request.headers.get("accept") ?? "application/json",
		authorization: `Bearer ${token}`,
		"x-request-id": requestId,
	});
	const contentType = request.headers.get("content-type");
	if (contentType) headers.set("content-type", contentType);
	const userAgent = request.headers.get("user-agent");
	if (userAgent) headers.set("user-agent", userAgent);

	if (request.method === "POST") {
		const csrfToken = request.headers.get("x-csrf-token");
		const csrfSession = getCookieValue(
			request.headers.get("cookie"),
			CSRF_SESSION_COOKIE_NAME,
		);
		if (!csrfToken || !csrfSession) {
			return problemResponse(
				403,
				"Invalid CSRF token",
				"A signing CSRF session and token are required.",
				requestId,
			);
		}
		headers.set("x-csrf-token", csrfToken);
		headers.set("cookie", `${BACKEND_SESSION_COOKIE_NAME}=${csrfSession}`);
	}

	const init: StreamingRequestInit = {
		method: request.method,
		headers,
		body: request.method === "POST" ? request.body : undefined,
		redirect: "manual",
	};
	if (request.body) init.duplex = "half";

	try {
		const upstream = await fetch(upstreamUrl, init);
		return relayUpstreamResponse(request, upstream, requestId);
	} catch {
		return problemResponse(
			502,
			"Backend unavailable",
			"The backend could not be reached.",
			requestId,
		);
	}
}

async function bootstrapCsrfSession(requestId: string): Promise<Response> {
	const upstreamUrl = new URL(
		getCsrfTokenContract.path,
		getServerEnvironment().BACKEND_URL,
	);
	let upstream: Response;

	try {
		upstream = await fetch(upstreamUrl, {
			method: getCsrfTokenContract.method,
			headers: { "x-request-id": requestId },
			redirect: "manual",
		});
	} catch {
		return problemResponse(
			502,
			"Backend unavailable",
			"The backend could not be reached.",
			requestId,
		);
	}

	const response = relayUpstreamResponse(
		new Request(upstreamUrl),
		upstream,
		requestId,
	);
	if (!upstream.ok) return response;

	const backendSession = getCookieValueFromSetCookie(
		getSetCookieHeaders(upstream.headers),
		BACKEND_SESSION_COOKIE_NAME,
	);
	if (!backendSession) {
		return problemResponse(
			502,
			"Backend session unavailable",
			"The backend did not establish a CSRF session.",
			requestId,
		);
	}

	response.headers.append(
		"set-cookie",
		`${CSRF_SESSION_COOKIE_NAME}=${encodeURIComponent(backendSession)}; Path=/; HttpOnly; Secure; SameSite=Lax`,
	);
	return response;
}

function isPublicSigningOperation(
	splat: string,
	method: string,
): splat is PublicSigningOperation {
	const operation = OPERATIONS[splat as PublicSigningOperation];
	return operation?.method === method.toUpperCase();
}

function getSigningToken(authorization: string | null): string | null {
	const match = authorization?.trim().match(/^Bearer\s+(.+)$/i);
	if (!match) return null;

	const parsed = PublicSigningTokenSchema.safeParse(match[1]);
	return parsed.success ? parsed.data : null;
}

function hasSameOrigin(request: Request): boolean {
	const origin = request.headers.get("origin");
	return origin === new URL(request.url).origin;
}

function getCookieValue(
	cookieHeader: string | null,
	name: string,
): string | null {
	if (!cookieHeader) return null;

	for (const entry of cookieHeader.split(";")) {
		const [cookieName, ...parts] = entry.trim().split("=");
		if (cookieName !== name) continue;

		try {
			return decodeURIComponent(parts.join("="));
		} catch {
			return null;
		}
	}

	return null;
}

function getCookieValueFromSetCookie(
	setCookies: string[],
	name: string,
): string | null {
	for (const setCookie of setCookies) {
		const [pair] = setCookie.split(";", 1);
		const separator = pair.indexOf("=");
		if (separator === -1 || pair.slice(0, separator) !== name) continue;
		return pair.slice(separator + 1);
	}

	return null;
}

function getSetCookieHeaders(headers: Headers): string[] {
	const multiValueHeaders = headers as MultiValueHeaders;
	if (typeof multiValueHeaders.getAll === "function") {
		return multiValueHeaders.getAll("set-cookie");
	}
	if (typeof multiValueHeaders.getSetCookie === "function") {
		return multiValueHeaders.getSetCookie();
	}
	const cookie = headers.get("set-cookie");
	return cookie ? [cookie] : [];
}

function relayUpstreamResponse(
	request: Request,
	upstream: Response,
	requestId: string,
): Response {
	const headers = new Headers();
	for (const name of ["content-type", "location", "x-request-id"]) {
		const value = upstream.headers.get(name);
		if (value) headers.set(name, value);
	}
	headers.set("cache-control", "no-store");
	headers.set("x-request-id", requestId);

	return new Response(
		request.method === "HEAD" || BODYLESS_STATUSES.has(upstream.status)
			? null
			: upstream.body,
		{ status: upstream.status, statusText: upstream.statusText, headers },
	);
}

function problemResponse(
	status: number,
	title: string,
	detail: string,
	requestId: string,
): Response {
	return Response.json(
		{ type: "about:blank", title, status, detail, requestId },
		{
			status,
			headers: { "cache-control": "no-store", "x-request-id": requestId },
		},
	);
}
