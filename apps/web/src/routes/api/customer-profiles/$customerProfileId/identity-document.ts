// import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireV2TenantUser } from "@/lib/auth/route-auth.server";
import { WrongActorError } from "@/shared/errors";

const customerProfileParamsSchema = z.object({
	customerProfileId: z.uuid(),
});

const customerProfileSearchSchema = z.object({
	objectPath: z
		.string()
		.min(1)
		.regex(/^[\w\-./]+$/, "Invalid object path"),
});

export const Route = createFileRoute(
	"/api/customer-profiles/$customerProfileId/identity-document",
)({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				// const customersBucket = env.CUSTOMERS_BUCKET;
				const customersBucket = {} as R2Bucket;

				const parsedParams = customerProfileParamsSchema.safeParse(params);

				if (!parsedParams.success) {
					return new Response("Invalid customer profile id", { status: 400 });
				}

				const { searchParams } = new URL(request.url);

				const parsedSearch = customerProfileSearchSchema.safeParse({
					objectPath: searchParams.get("objectPath"),
				});

				if (!parsedSearch.success) {
					return new Response("Invalid object path", { status: 400 });
				}

				try {
					await requireV2TenantUser();
				} catch (error) {
					if (error instanceof WrongActorError) {
						return new Response("Forbidden", { status: 403 });
					}

					return new Response("Unauthorized", { status: 401 });
				}

				const object = await customersBucket.get(parsedSearch.data.objectPath);

				if (!object?.body) {
					return new Response("Document not found", { status: 404 });
				}

				const headers = new Headers();
				object.writeHttpMetadata(headers);
				headers.set("Cache-Control", "private, no-store");
				headers.set("Content-Disposition", "inline");
				headers.set("X-Content-Type-Options", "nosniff");

				if (!headers.has("Content-Type")) {
					headers.set("Content-Type", "application/octet-stream");
				}

				headers.set("ETag", object.httpEtag);

				return new Response(object.body, {
					status: 200,
					headers,
				});
			},
		},
	},
});
