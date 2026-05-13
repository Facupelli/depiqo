import { problemDetailsSchema, type PaginatedDto } from "@repo/schemas";
import { ProblemDetailsError } from "@/shared/errors";

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
	body?: unknown;
	params?: Record<string, unknown>;
};

export type ApiFetchOptions = ApiRequestOptions & {
	accessToken?: string;
};

export async function requestJson<T>(
	path: string,
	options: ApiFetchOptions = {},
): Promise<T> {
	const { body, headers, params, accessToken, ...rest } = options;
	const url = new URL(`${process.env.BACKEND_URL}${path}`);

	if (params) {
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				url.searchParams.set(key, String(value));
			}
		});
	}

	const requestHeaders = new Headers(headers);
	if (!requestHeaders.has("Content-Type") && body !== undefined) {
		requestHeaders.set("Content-Type", "application/json");
	}
	if (accessToken) {
		requestHeaders.set("Authorization", `Bearer ${accessToken}`);
	}

	let response: Response;

	try {
		response = await fetch(url, {
			...rest,
			headers: requestHeaders,
			body: body !== undefined ? JSON.stringify(body) : undefined,
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
						title: response.statusText ?? "Request Failed",
						status: response.status,
						detail: `Request to ${path} failed with status ${response.status}`,
					},
		);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return response.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function apiFetch<T>(
	path: string,
	options: ApiFetchOptions = {},
): Promise<T> {
	const body = await requestJson<{ data: T }>(path, options);
	return body?.data;
}

export async function apiFetchPaginated<T>(
	path: string,
	options: ApiFetchOptions = {},
): Promise<PaginatedDto<T>> {
	const body = await requestJson<PaginatedDto<T>>(path, options);
	return body;
}
