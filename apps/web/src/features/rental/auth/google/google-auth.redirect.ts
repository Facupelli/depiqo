import { clientEnv } from "@/config/client-env";

const GOOGLE_AUTHORIZATION_ENDPOINT =
	"https://accounts.google.com/o/oauth2/v2/auth";

type DecodedGoogleAuthState = {
	portalOrigin?: string;
	redirectPath: string;
};

export function buildSharedGoogleAuthStartUrl(state: string): string {
	const url = new URL("/auth/google/start", clientEnv.VITE_SHARED_AUTH_ORIGIN);
	url.searchParams.set("state", state);
	return url.toString();
}

export function buildGoogleAuthorizationUrl(state: string): string {
	const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
	url.searchParams.set("client_id", clientEnv.VITE_GOOGLE_CLIENT_ID);
	url.searchParams.set("redirect_uri", getGoogleCallbackRedirectUri());
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", "openid email profile");
	url.searchParams.set("state", state);
	url.searchParams.set("prompt", "select_account");
	return url.toString();
}

export function getGoogleCallbackRedirectUri(): string {
	return new URL(
		"/auth/google/callback",
		clientEnv.VITE_SHARED_AUTH_ORIGIN,
	).toString();
}

export function decodeGoogleAuthState(state: string): DecodedGoogleAuthState {
	const payload = state.split(".")[1];

	if (!payload) {
		throw new Error("El estado de autenticacion de Google es invalido.");
	}

	try {
		const parsed = JSON.parse(
			decodeBase64Url(payload),
		) as Partial<DecodedGoogleAuthState>;

		if (
			typeof parsed.redirectPath !== "string" ||
			parsed.redirectPath.length === 0
		) {
			throw new Error("Missing redirect path");
		}

		return {
			portalOrigin:
				typeof parsed.portalOrigin === "string"
					? parsed.portalOrigin
					: undefined,
			redirectPath: parsed.redirectPath,
		};
	} catch {
		throw new Error("No pudimos leer el estado de autenticacion de Google.");
	}
}

function decodeBase64Url(value: string): string {
	const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
	const paddedValue = normalizedValue.padEnd(
		normalizedValue.length + ((4 - (normalizedValue.length % 4)) % 4),
		"=",
	);

	if (typeof atob === "function") {
		return atob(paddedValue);
	}

	return Buffer.from(paddedValue, "base64").toString("utf-8");
}
