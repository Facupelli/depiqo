import { serverEnv } from "@/config/server-env";
import { getForwardedCookieHeader } from "./request-context";

export async function apiFetchRaw(
	path: string,
	init: RequestInit = {},
): Promise<Response> {
	const headers = new Headers(init.headers);
	const cookie = getForwardedCookieHeader();

	if (cookie && !headers.has("cookie")) {
		headers.set("cookie", cookie);
	}

	return fetch(new URL(path, serverEnv.BACKEND_URL), {
		...init,
		headers,
	});
}
