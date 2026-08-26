import { clientEnv } from "@/config/client-env";

export function buildCustomerGoogleStartUrl(state: string): string {
	const url = new URL("/auth/google/start", clientEnv.VITE_SHARED_AUTH_ORIGIN);
	url.searchParams.set("state", state);
	return url.toString();
}
