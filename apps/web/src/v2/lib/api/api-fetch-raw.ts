import { getForwardedCookieHeader } from "./request-context";

const SERVER_API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

export async function apiFetchRaw(
	path: string,
	init: RequestInit = {},
): Promise<Response> {
	const headers = new Headers(init.headers);
	const cookie = getForwardedCookieHeader();

	if (cookie && !headers.has("cookie")) {
		headers.set("cookie", cookie);
	}

	return fetch(`${SERVER_API_BASE_URL}${path}`, {
		...init,
		headers,
	});
}
