import {
	GetCsrfTokenResponseSchema,
	getCsrfTokenContract,
} from "@repo/api-contracts";

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

const BROWSER_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export function setCsrfToken(token: string | null): void {
	csrfToken = token;
}

export async function getCsrfToken(): Promise<string> {
	if (csrfToken) return csrfToken;

	if (!csrfTokenPromise) {
		csrfTokenPromise = fetch(
			`${BROWSER_API_BASE_URL}${getCsrfTokenContract.path}`,
			{
				method: getCsrfTokenContract.method,
				credentials: "include",
			},
		)
			.then(async (response) => {
				if (!response.ok) {
					throw new Error(`Failed to fetch CSRF token: ${response.status}`);
				}

				return response.json() as Promise<{ data: { csrfToken: string } }>;
			})
			.then((data) => {
				return GetCsrfTokenResponseSchema.parse(data.data).csrfToken;
			})
			.finally(() => {
				csrfTokenPromise = null;
			});
	}

	return csrfTokenPromise;
}
