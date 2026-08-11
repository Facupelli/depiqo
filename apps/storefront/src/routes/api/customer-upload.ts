import {
	handleRequest,
	RejectUpload,
	type Router,
	route,
} from "@better-upload/server";
import { cloudflare } from "@better-upload/server/clients";
import {
	GetCurrentCustomerResponseSchema,
	getCurrentCustomerContract,
} from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getServerEnvironment } from "@/config/server-env";
import { normalizeRequestHostname } from "@/modules/tenant-management/resolve-public-tenant-context/hostname";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import {
	resolveTrustedTenantContext,
	TenantResolverFailure,
} from "@/modules/tenant-management/resolve-public-tenant-context/resolve-trusted-tenant-context.server";
import { storefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";

const s3 = cloudflare({
	accountId: getServerEnvironment().CLOUDFLARE_ACCOUNT_ID,
	accessKeyId: getServerEnvironment().R2_CUSTOMERS_ACCESS_KEY_ID,
	secretAccessKey: getServerEnvironment().R2_CUSTOMERS_SECRET_ACCESS_KEY,
});

const clientMetadataSchema = z.object({
	customerId: z.string().min(1),
});

type CanonicalStorefrontResolution =
	| { success: true; requestContext: StorefrontRequestContext }
	| {
			success: false;
			status: 400 | 404;
			detail: "Invalid storefront host" | "Storefront tenant not found";
	  }
	| { success: false; status: 308; canonicalHost: string };

const uploadRouter: Router = {
	client: s3,
	bucketName: getServerEnvironment().R2_CUSTOMERS_BUCKET_NAME,
	routes: {
		identityDocument: route({
			fileTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
			maxFileSize: 1024 * 1024 * 3,
			clientMetadataSchema,
			onBeforeUpload: async ({ req, file, clientMetadata }) => {
				const customerId = await getAuthenticatedCustomerId(req);

				if (clientMetadata.customerId !== customerId) {
					throw new RejectUpload("Unauthorized");
				}

				const extension = file.name.split(".").pop() ?? "bin";
				const key = `customers/${customerId}/identity-document-${Date.now()}.${extension}`;

				return {
					objectInfo: {
						key,
						metadata: {
							"uploaded-by": customerId,
							"original-name": file.name,
						},
					},
				};
			},
		}),
	},
};

export const Route = createFileRoute("/api/customer-upload")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const requestContext = await validateUploadRequest(request);
				if (requestContext instanceof Response) return requestContext;

				return handleRequest(request, uploadRouter);
			},
		},
	},
});

async function getAuthenticatedCustomerId(request: Request): Promise<string> {
	const resolution = await resolveCanonicalStorefrontRequest(request);
	if (!resolution.success) throw new RejectUpload("Unauthorized");

	try {
		const customer = await storefrontApiFetch(resolution.requestContext, {
			path: getCurrentCustomerContract.path,
			method: getCurrentCustomerContract.method,
			headers: customerSessionHeaders(request),
		});

		return GetCurrentCustomerResponseSchema.parse(customer).id;
	} catch {
		throw new RejectUpload("Unauthorized");
	}
}

async function validateUploadRequest(
	request: Request,
): Promise<StorefrontRequestContext | Response> {
	const requestUrl = new URL(request.url);
	const origin = request.headers.get("origin");
	if (!origin || origin !== requestUrl.origin) {
		return new Response("Cross-origin requests are not allowed", {
			status: 403,
		});
	}

	const resolution = await resolveCanonicalStorefrontRequest(request);
	if (resolution.success) return resolution.requestContext;

	if (resolution.status === 308) {
		const location = new URL(request.url);
		location.hostname = resolution.canonicalHost;
		location.port = "";
		return new Response(null, {
			status: 308,
			headers: { "cache-control": "no-store", location: location.toString() },
		});
	}

	return new Response(resolution.detail, { status: resolution.status });
}

async function resolveCanonicalStorefrontRequest(
	request: Request,
): Promise<CanonicalStorefrontResolution> {
	const hostname = normalizeRequestHostname(request.headers.get("host"));
	if (!hostname.success) {
		return {
			success: false,
			status: 400,
			detail: "Invalid storefront host",
		};
	}

	const requestContext: StorefrontRequestContext = {
		hostname: hostname.hostname,
		requestId: getRequestId(request),
	};

	try {
		const tenantContext = await resolveTrustedTenantContext(requestContext);
		if (tenantContext.face !== "storefront") {
			return {
				success: false,
				status: 404,
				detail: "Storefront tenant not found",
			};
		}

		if (tenantContext.host !== tenantContext.canonicalHost) {
			return {
				success: false,
				status: 308,
				canonicalHost: tenantContext.canonicalHost,
			};
		}

		return { success: true, requestContext };
	} catch (error) {
		if (error instanceof TenantResolverFailure) {
			return {
				success: false,
				status: error.status,
				detail:
					error.kind === "invalid-host"
						? "Invalid storefront host"
						: "Storefront tenant not found",
			};
		}
		throw error;
	}
}

function getRequestId(request: Request): string {
	const requestId = request.headers.get("x-request-id");
	return requestId && /^[A-Za-z0-9._:-]{1,128}$/.test(requestId)
		? requestId
		: crypto.randomUUID();
}

function customerSessionHeaders(request: Request): HeadersInit | undefined {
	const cookie = request.headers.get("cookie");
	return cookie ? { cookie } : undefined;
}
