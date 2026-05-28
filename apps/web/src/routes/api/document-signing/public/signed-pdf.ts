import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { fetchPublicSigningSignedPdfResponse } from "@/v2/features/document-signing/stream-public-signed-receipt-document/stream-public-signed-receipt-document.api";

const searchSchema = z.object({
	token: z.string().trim().min(1),
});

function jsonError(message: string, status: number) {
	return Response.json({ message }, { status });
}

export const Route = createFileRoute("/api/document-signing/public/signed-pdf")(
	{
		server: {
			handlers: {
				GET: async ({ request }) => {
					const url = new URL(request.url);
					const parsedSearch = searchSchema.safeParse({
						token: url.searchParams.get("token") ?? "",
					});

					if (!parsedSearch.success) {
						return jsonError("Token de firma invalido.", 400);
					}

					try {
						const response = await fetchPublicSigningSignedPdfResponse(
							parsedSearch.data.token,
						);
						const headers = new Headers();
						const contentType = response.headers.get("Content-Type");
						const contentDisposition = response.headers.get(
							"Content-Disposition",
						);

						if (contentType) {
							headers.set("Content-Type", contentType);
						}

						if (contentDisposition) {
							headers.set("Content-Disposition", contentDisposition);
						}

						headers.set("Cache-Control", "private, no-store");
						headers.set("X-Content-Type-Options", "nosniff");

						return new Response(response.body, {
							status: response.status,
							headers,
						});
					} catch (error) {
						return jsonError(
							error instanceof Error
								? error.message
								: "No pudimos descargar el PDF firmado.",
							500,
						);
					}
				},
			},
		},
	},
);
