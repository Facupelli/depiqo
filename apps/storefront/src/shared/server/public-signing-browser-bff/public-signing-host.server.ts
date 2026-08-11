import { getServerEnvironment } from "@/config/server-env";

export function getPublicSigningHostname(): string {
	return new URL(getServerEnvironment().PUBLIC_SIGNING_ORIGIN).hostname;
}
