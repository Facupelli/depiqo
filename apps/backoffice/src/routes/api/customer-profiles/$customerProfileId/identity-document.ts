import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireV2TenantUser } from "@/lib/auth/route-auth.server";
import { getCustomerDocument } from "@/lib/object-storage/r2-customer-document-storage.server";
import { getCustomerProfileDetail } from "@/modules/customers/review-customer-onboarding/customer-onboarding-profile.api";
import { ProblemDetailsError, WrongActorError } from "@/shared/errors";

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

				try {
					const customer = await getCustomerProfileDetail(
						parsedParams.data.customerProfileId,
					);

					if (
						customer.profile.identityDocumentPath !==
						parsedSearch.data.objectPath
					) {
						return new Response("Document not found", { status: 404 });
					}
				} catch (error) {
					if (error instanceof ProblemDetailsError) {
						return new Response(error.problemDetails.detail, {
							status: error.problemDetails.status,
						});
					}

					return new Response("Unable to retrieve customer profile", {
						status: 500,
					});
				}

				try {
					const object = await getCustomerDocument(
						parsedSearch.data.objectPath,
					);

					if (!object) {
						return new Response("Document not found", { status: 404 });
					}

					const headers = new Headers({
						"Cache-Control": "private, no-store",
						"Content-Disposition": "inline",
						"Content-Type": object.contentType ?? "application/octet-stream",
						ETag: object.etag ?? "",
						"X-Content-Type-Options": "nosniff",
					});

					if (object.contentLength !== undefined) {
						headers.set("Content-Length", String(object.contentLength));
					}

					if (!object.etag) {
						headers.delete("ETag");
					}

					return new Response(object.body, {
						status: 200,
						headers,
					});
				} catch {
					return new Response("Unable to retrieve document", { status: 500 });
				}
			},
		},
	},
});
