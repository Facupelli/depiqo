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
	accessKeyId: serverEnv.CLOUDFLARE_R2_ACCESS_KEY_ID,
	secretAccessKey: serverEnv.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
});

const uploadRouter: Router = {
	client: s3,
	bucketName: serverEnv.CLOUDFLARE_R2_BUCKET_NAME,
	routes: {
		catalogImages: route({
			fileTypes: ["image/webp"],
			maxFileSize: 1024 * 1024 * 3, // 3MB after client-side compression
			onBeforeUpload: async () => {
				let tenantId: string;

				try {
					tenantId = (await requireV2TenantUser()).tenantId;
				} catch {
					throw new RejectUpload("Unauthorized");
				}

				const key = `${tenantId}/catalog/${crypto.randomUUID()}.webp`;

				return {
					objectInfo: { key },
					metadata: { key }, // echoed back to client after upload
				};
			},
		}),
	},
};

export const Route = createFileRoute("/api/upload")({
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
