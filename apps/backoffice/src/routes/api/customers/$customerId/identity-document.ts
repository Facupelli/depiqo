import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { serverEnv } from "@/config/server-env";
import { requireV2TenantUser } from "@/lib/auth/route-auth.server";
import { getCustomerDocument } from "@/lib/object-storage/r2-customer-document-storage.server";
import { WrongActorError } from "@/shared/errors";

const paramsSchema = z.object({ customerId: z.uuid() });
const descriptorResponseSchema = z.object({
	data: z.object({ objectPath: z.string().min(1) }),
});
const inlineTypes: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"application/pdf": "pdf",
};
const noStore = {
	"Cache-Control": "private, no-store",
	"X-Content-Type-Options": "nosniff",
};

export const Route = createFileRoute(
	"/api/customers/$customerId/identity-document",
)({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const parsed = paramsSchema.safeParse(params);
				if (!parsed.success) return reply("ID de cliente inválido.", 400);
				if (new URL(request.url).search)
					return reply("Solicitud de documento inválida.", 400);

				try {
					await requireV2TenantUser();
				} catch (error) {
					return reply(
						error instanceof WrongActorError
							? "Acceso denegado."
							: "Debés iniciar sesión.",
						error instanceof WrongActorError ? 403 : 401,
					);
				}

				try {
					const url = new URL(
						`/internal/tenant-management/rental-customers/${encodeURIComponent(parsed.data.customerId)}/identity-document-descriptor`,
						serverEnv.BACKEND_URL,
					);
					const descriptorResponse = await fetch(url, {
						headers: {
							"x-internal-token": serverEnv.BFF_INTERNAL_TOKEN,
							cookie: request.headers.get("cookie") ?? "",
						},
						redirect: "manual",
					});
					if (!descriptorResponse.ok) {
						if (descriptorResponse.status === 404) return unavailable();
						return reply(
							"No se pudo autorizar el documento.",
							[401, 403].includes(descriptorResponse.status)
								? descriptorResponse.status
								: 502,
						);
					}
					const { objectPath } = descriptorResponseSchema.parse(
						await descriptorResponse.json(),
					).data;
					const object = await getCustomerDocument(objectPath);
					if (!object) return unavailable();

					const contentType = object.contentType?.toLowerCase();
					if (!contentType)
						return reply("Formato de documento no disponible.", 415);
					const extension = inlineTypes[contentType];
					if (!extension)
						return reply("Formato de documento no disponible.", 415);

					const headers = new Headers(noStore);
					headers.set("Content-Type", contentType);
					headers.set(
						"Content-Disposition",
						`inline; filename="identity-document.${extension}"`,
					);
					if (object.contentLength !== undefined)
						headers.set("Content-Length", String(object.contentLength));
					if (object.etag) headers.set("ETag", object.etag);
					return new Response(object.body, { headers });
				} catch {
					return reply("No pudimos abrir el documento.", 502);
				}
			},
		},
	},
});

function reply(message: string, status: number) {
	return new Response(message, { status, headers: noStore });
}

function unavailable() {
	return reply(
		"No pudimos abrir el documento porque el archivo no está disponible.",
		404,
	);
}
