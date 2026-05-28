import {
	handleRequest,
	RejectUpload,
	type Router,
	route,
} from "@better-upload/server";
import { cloudflare } from "@better-upload/server/clients";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { serverEnv } from "@/config/server-env";
import { requireV2TenantCustomer } from "@/v2/lib/auth/route-auth.server";

const s3 = cloudflare({
	accountId: serverEnv.CLOUDFLARE_ACCOUNT_ID,
	accessKeyId: serverEnv.R2_CUSTOMERS_ACCESS_KEY_ID,
	secretAccessKey: serverEnv.R2_CUSTOMERS_SECRET_ACCESS_KEY,
});

const clientMetadataSchema = z.object({
	customerId: z.string().min(1),
});

const uploadRouter: Router = {
	client: s3,
	bucketName: serverEnv.R2_CUSTOMERS_BUCKET_NAME,
	routes: {
		// Single-file route for the identity document (DNI / passport / etc.)
		identityDocument: route({
			// Accept images and PDFs — PDF allows easy front+back merges
			fileTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
			maxFileSize: 1024 * 1024 * 3, // 3 MB
			clientMetadataSchema,

			onBeforeUpload: async ({ req: _, file, clientMetadata }) => {
				let customerId: string;

				try {
					customerId = (await requireV2TenantCustomer()).id;
				} catch {
					throw new RejectUpload("Unauthorized");
				}

				// Prevent users from uploading to another customer's path.
				// The session is the source of truth — client metadata is untrusted.
				if (clientMetadata.customerId !== customerId) {
					throw new RejectUpload("Unauthorized");
				}

				const ext = file.name.split(".").pop() ?? "bin";
				const key = `customers/${customerId}/identity-document-${Date.now()}.${ext}`;

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
				return handleRequest(request, uploadRouter);
			},
		},
	},
});
