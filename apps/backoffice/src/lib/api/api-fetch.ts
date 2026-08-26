import { problemDetailsSchema } from "@repo/api-contracts";
import { getCsrfToken } from "@/lib/api/csrf-token";
import { ProblemDetailsError } from "@/shared/errors";
import { getBackendApiBaseUrl } from "./backend-api-url";
import {
	getForwardedCookieHeader,
	getForwardedCsrfHeader,
} from "./request-context";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_HEADER_NAME = "x-csrf-token";

export async function apiFetch<T = unknown>(
	path: string,
	init: RequestInit = {},
): Promise<T | null> {
	const isServer = typeof window === "undefined";
	const baseUrl = getBackendApiBaseUrl();

	const method = (init.method ?? "GET").toUpperCase();
	const headers = new Headers(init.headers);

	if (isServer) {
		const cookie = getForwardedCookieHeader();

		if (cookie && !headers.has("cookie")) {
			headers.set("cookie", cookie);
		}

		if (
			cookie &&
			UNSAFE_METHODS.has(method) &&
			!headers.has(CSRF_HEADER_NAME)
		) {
			const csrfToken = getForwardedCsrfHeader();

			if (csrfToken) {
				headers.set(CSRF_HEADER_NAME, csrfToken);
			}
		}
	}

	if (
		typeof window !== "undefined" &&
		UNSAFE_METHODS.has(method) &&
		!headers.has(CSRF_HEADER_NAME)
	) {
		headers.set(CSRF_HEADER_NAME, await getCsrfToken());
	}

	let response: Response;

	try {
		response = await fetch(`${baseUrl}${path}`, {
			...init,
			headers,
			credentials: isServer ? undefined : "include",
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
						detail: `Request to ${path} failed with status ${response.status}`,
					},
		);
	}

	if (response.status === 204) {
		return null;
	}

	const rawBody = await response.text();
	if (!rawBody) {
		return null;
	}

	const data = JSON.parse(rawBody) as { data: T };
	return data.data;
}
