import {
	resolveInternalTenantContextContract,
	type TrustedTenantContext,
	TrustedTenantContextSchema,
} from "@repo/api-contracts";
import { createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerEnvironment } from "@/config/server-env";
import { logStorefrontServerEvent } from "@/shared/server/logging/storefront-server-logger.server";
import type { StorefrontRequestContext } from "./request-context.middleware";

const resolverResponseSchema = z.object({
	data: TrustedTenantContextSchema,
});

export type TenantResolverFailureKind = "invalid-host" | "unknown-host";

export class TenantResolverFailure extends Error {
	constructor(
		public readonly kind: TenantResolverFailureKind,
		public readonly status: 400 | 404,
	) {
		super(kind);
		this.name = "TenantResolverFailure";
	}
}

export const resolveTrustedTenantContext = createServerOnlyFn(
	async (
		requestContext: StorefrontRequestContext,
	): Promise<TrustedTenantContext> => {
		const startedAt = Date.now();
		const environment = getServerEnvironment();
		const url = new URL(
			resolveInternalTenantContextContract.path,
			environment.BACKEND_URL,
		);
		url.searchParams.set("hostname", requestContext.hostname);

		let response: Response;

		try {
			response = await fetch(url, {
				method: resolveInternalTenantContextContract.method,
				headers: {
					"x-internal-token": environment.BFF_INTERNAL_TOKEN,
					"x-request-id": requestContext.requestId,
				},
			});
		} catch {
			logResolution(requestContext, startedAt, 503, "network-error");
			throw new Error("Tenant context resolver is unavailable");
		}

		if (response.status === 400) {
			logResolution(requestContext, startedAt, 400, "invalid-host");
			throw new TenantResolverFailure("invalid-host", 400);
		}

		if (response.status === 404) {
			logResolution(requestContext, startedAt, 404, "unknown-host");
			throw new TenantResolverFailure("unknown-host", 404);
		}

		if (!response.ok) {
			logResolution(
				requestContext,
				startedAt,
				response.status,
				"upstream-error",
			);
			throw new Error("Tenant context resolver returned an error");
		}

		const parsedResponse = resolverResponseSchema.safeParse(
			await response.json().catch(() => null),
		);

		if (!parsedResponse.success) {
			logResolution(requestContext, startedAt, 502, "invalid-response");
			throw new Error("Tenant context resolver returned an invalid response");
		}

		const context = parsedResponse.data.data;

		logStorefrontServerEvent({
			event: "storefront.tenant-resolution.completed",
			requestId: requestContext.requestId,
			hostname: requestContext.hostname,
			status: 200,
			durationMs: Date.now() - startedAt,
			face: context.face,
			...(context.face === "storefront"
				? { tenantId: context.tenantId, tenantSlug: context.slug }
				: {}),
		});

		return context;
	},
);

function logResolution(
	requestContext: StorefrontRequestContext,
	startedAt: number,
	status: number,
	reason: string,
): void {
	logStorefrontServerEvent({
		event: "storefront.tenant-resolution.failed",
		requestId: requestContext.requestId,
		hostname: requestContext.hostname,
		status,
		durationMs: Date.now() - startedAt,
		reason,
	});
}
