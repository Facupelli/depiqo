import {
	handleRequest,
	RejectUpload,
	type Router,
	route,
} from "@better-upload/server";
import { cloudflare } from "@better-upload/server/clients";
import { createFileRoute } from "@tanstack/react-router";
import { serverEnv } from "@/config/server-env";
import { requireV2TenantUser } from "@/v2/lib/auth/route-auth.server";

const s3 = cloudflare({
	accountId: serverEnv.CLOUDFLARE_ACCOUNT_ID,
	accessKeyId: serverEnv.R2_BRANDING_ACCESS_KEY_ID,
	secretAccessKey: serverEnv.R2_BRANDING_SECRET_ACCESS_KEY,
});

const uploadRouter: Router = {
	client: s3,
	bucketName: serverEnv.CLOUDFLARE_R2_BRANDING_BUCKET_NAME,
	routes: {
		brandingLogo: route({
			fileTypes: ["image/webp"],
			maxFileSize: 1024 * 1024 * 3,
			onBeforeUpload: async () => {
				let tenantId: string;

				try {
					tenantId = (await requireV2TenantUser()).tenantId;
				} catch {
					throw new RejectUpload("Unauthorized");
				}

				const key = `${tenantId}/logo/${crypto.randomUUID()}.webp`;

				return {
					objectInfo: { key },
					metadata: { key },
				};
			},
		}),
		brandingFavicon: route({
			fileTypes: ["image/png"],
			maxFileSize: 1024 * 1024,
			onBeforeUpload: async () => {
				let tenantId: string;

				try {
					tenantId = (await requireV2TenantUser()).tenantId;
				} catch {
					throw new RejectUpload("Unauthorized");
				}

				const key = `${tenantId}/favicon/${crypto.randomUUID()}.png`;

				return {
					objectInfo: { key },
					metadata: { key },
				};
			},
		}),
		userSignature: route({
			fileTypes: ["image/png"],
			maxFileSize: 1024 * 1024 * 3,
			onBeforeUpload: async () => {
				let tenantId: string;

				try {
					tenantId = (await requireV2TenantUser()).tenantId;
				} catch {
					throw new RejectUpload("Unauthorized");
				}

				const key = `${tenantId}/signatures/${crypto.randomUUID()}.png`;

				return {
					objectInfo: { key },
					metadata: { key },
				};
			},
		}),
	},
};

export const Route = createFileRoute("/api/branding-upload")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					return handleRequest(request, uploadRouter);
				} catch (error) {
					console.log(error);
					return new Response(
						JSON.stringify({ error: "Internal upload error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
