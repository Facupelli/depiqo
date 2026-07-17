import {
	GetCsrfTokenResponseSchema,
	getCsrfTokenContract,
} from "@repo/api-contracts";
import { BACKEND_PROXY_PREFIX } from "@/lib/api/backend-api-url";

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

export function setCsrfToken(token: string | null): void {
	csrfToken = token;
}

export async function getCsrfToken(): Promise<string> {
	if (csrfToken) return csrfToken;

	if (!csrfTokenPromise) {
		csrfTokenPromise = fetch(
			`${BACKEND_PROXY_PREFIX}${getCsrfTokenContract.path}`,
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
