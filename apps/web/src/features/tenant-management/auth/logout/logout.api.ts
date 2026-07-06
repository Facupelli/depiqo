import { logoutContract } from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";
import { setCsrfToken } from "../csrf-token";

export async function logout(): Promise<void> {
	await apiFetch(logoutContract.path, {
		method: logoutContract.method,
	});

	setCsrfToken(null);
}
