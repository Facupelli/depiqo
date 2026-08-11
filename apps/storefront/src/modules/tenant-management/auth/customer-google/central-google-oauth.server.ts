import {
	CustomerGoogleHandoffResponseSchema,
	customerGoogleHandoffContract,
} from "@repo/api-contracts";
import { z } from "zod";
import { clientEnv } from "@/config/client-env";
import { getServerEnvironment } from "@/config/server-env";
import { normalizeRequestHostname } from "../../resolve-public-tenant-context/hostname";

const callbackSearchSchema = z.object({
	code: z.string().min(1).optional(),
	error: z.string().min(1).optional(),
	state: z.string().min(1).optional(),
});
const responseEnvelopeSchema = z.object({ data: z.unknown() });

export async function redirectToGoogleAuthorization(
	request: Request,
): Promise<Response> {
	if (!isSharedAuthRequest(request))
		return new Response("Not Found", { status: 404 });

	const url = new URL(request.url);
	const state = url.searchParams.get("state");
	if (!state) return new Response("Invalid OAuth request", { status: 400 });

	const authorizationUrl = new URL(
		"https://accounts.google.com/o/oauth2/v2/auth",
	);
	authorizationUrl.searchParams.set(
		"client_id",
		clientEnv.VITE_GOOGLE_CLIENT_ID,
	);
	authorizationUrl.searchParams.set("redirect_uri", getGoogleCallbackUri());
	authorizationUrl.searchParams.set("response_type", "code");
	authorizationUrl.searchParams.set("scope", "openid email profile");
	authorizationUrl.searchParams.set("state", state);
	authorizationUrl.searchParams.set("prompt", "select_account");

	return Response.redirect(authorizationUrl, 302);
}

export async function handleGoogleCallback(
	request: Request,
): Promise<Response> {
	if (!isSharedAuthRequest(request))
		return new Response("Not Found", { status: 404 });

	const url = new URL(request.url);
	const parsedSearch = callbackSearchSchema.safeParse(
		Object.fromEntries(url.searchParams),
	);
	if (
		!parsedSearch.success ||
		parsedSearch.data.error ||
		!parsedSearch.data.code ||
		!parsedSearch.data.state
	) {
		return new Response("Google authentication was not completed.", {
			status: 400,
		});
	}

	const backendUrl = new URL(
		customerGoogleHandoffContract.path,
		getServerEnvironment().BACKEND_URL,
	);
	const response = await fetch(backendUrl, {
		method: customerGoogleHandoffContract.method,
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			code: parsedSearch.data.code,
			state: parsedSearch.data.state,
		}),
	});

	if (!response.ok)
		return new Response("Google authentication could not be completed.", {
			status: 401,
		});

	const envelope = responseEnvelopeSchema.safeParse(
		await response.json().catch(() => null),
	);
	if (!envelope.success)
		return new Response("Google authentication could not be completed.", {
			status: 502,
		});

	const handoff = CustomerGoogleHandoffResponseSchema.safeParse(
		envelope.data.data,
	);
	if (!handoff.success)
		return new Response("Google authentication could not be completed.", {
			status: 502,
		});

	const finalizeUrl = new URL(
		"/auth/google/finalize",
		`https://${handoff.data.canonicalHost}`,
	);
	finalizeUrl.searchParams.set("ticket", handoff.data.ticket);
	return Response.redirect(finalizeUrl, 303);
}

function getGoogleCallbackUri(): string {
	return new URL(
		"/auth/google/callback",
		clientEnv.VITE_SHARED_AUTH_ORIGIN,
	).toString();
}

function isSharedAuthRequest(request: Request): boolean {
	const expected = new URL(clientEnv.VITE_SHARED_AUTH_ORIGIN).hostname;
	const hostname = normalizeRequestHostname(request.headers.get("host"));
	return hostname.success && hostname.hostname === expected;
}
