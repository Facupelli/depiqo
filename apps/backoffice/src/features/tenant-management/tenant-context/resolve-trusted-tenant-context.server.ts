import {
	resolveInternalTenantContextContract,
	TrustedTenantContextSchema,
	type TrustedTenantContext,
} from "@repo/api-contracts";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { serverEnv } from "@/config/server-env";

const ResolverResponseSchema = z.object({
	data: TrustedTenantContextSchema,
});

export async function resolveTrustedTenantContextFromRequest(): Promise<TrustedTenantContext> {
	const hostname = getTrustedRequestHostname();
	const url = new URL(
		resolveInternalTenantContextContract.path,
		serverEnv.BACKEND_URL,
	);
	url.searchParams.set("hostname", hostname);

	const response = await fetch(url, {
		method: resolveInternalTenantContextContract.method,
		headers: {
			"x-internal-token": serverEnv.BFF_INTERNAL_TOKEN,
		},
	});

	if (response.status === 404) {
		throw new TenantContextNotFoundError(hostname);
	}

	if (!response.ok) {
		throw new Error(`Failed to resolve tenant context: ${response.status}`);
	}

	const result = ResolverResponseSchema.safeParse(await response.json());

	if (!result.success) {
		throw new Error("Tenant context resolver returned an invalid response");
	}

	return result.data.data;
}

function getTrustedRequestHostname(): string {
	const host = getRequestHeader("host");

	if (!host) {
		throw new Error("Missing request host");
	}

	return new URL(`http://${host}`).hostname;
}

export class TenantContextNotFoundError extends Error {
	readonly isTenantContextNotFound = true;

	constructor(hostname: string) {
		super(`No tenant context found for hostname: ${hostname}`);
	}
}
