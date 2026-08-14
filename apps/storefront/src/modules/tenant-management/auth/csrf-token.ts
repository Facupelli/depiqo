import {
	GetCsrfTokenResponseSchema,
	getCsrfTokenContract,
} from "@repo/api-contracts";
import { sessionBrowserApiFetch } from "./session-browser-api";

let csrfToken: string | null = null;
let pendingToken: Promise<string> | null = null;

export function setCustomerCsrfToken(token: string | null): void {
	csrfToken = token;
}

export async function getCustomerCsrfToken(): Promise<string> {
	if (csrfToken) return csrfToken;
	pendingToken ??= sessionBrowserApiFetch(getCsrfTokenContract.path, {
		method: getCsrfTokenContract.method,
	})
		.then((data) => GetCsrfTokenResponseSchema.parse(data).csrfToken)
		.finally(() => {
			pendingToken = null;
		});
	return pendingToken;
}
