import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { apiFetchRaw } from "@/lib/api/api-fetch-raw";
import { requireV2TenantUser } from "@/lib/auth/route-auth.server";
import {
	AuthRequiredError,
	ProblemDetailsError,
	SessionExpiredError,
	WrongActorError,
} from "@/shared/errors";

const orderParamsSchema = z.object({
	orderId: z.uuid(),
});

function jsonError(message: string, status: number) {
	return Response.json({ message }, { status });
}

export const Route = createFileRoute(
	"/api/orders/$orderId/contract/signed/download",
)({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const parsedParams = orderParamsSchema.safeParse(params);

				if (!parsedParams.success) {
					return jsonError("Pedido invalido.", 400);
				}

				try {
					await requireV2TenantUser();
					const response = await apiFetchRaw(
						`/orders/${parsedParams.data.orderId}/contract/signed/download`,
						{
							method: "GET",
						},
					);

					if (response.ok) {
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
					}

					if (response.status === 404) {
						return jsonError("Remito firmado no encontrado.", 404);
					}

					if (response.status === 422) {
						return jsonError(
							"No se puede generar el remito firmado porque el cliente no tiene DNI/documento configurado en su perfil.",
							422,
						);
					}

					const raw = await response.json().catch(() => null);
					const problem =
						raw && typeof raw === "object"
							? (raw as { detail?: unknown })
							: null;

					return jsonError(
						typeof problem?.detail === "string"
							? problem.detail
							: "No pudimos generar el remito firmado en este momento.",
						response.status || 500,
					);
				} catch (error) {
					if (
						error instanceof AuthRequiredError ||
						error instanceof SessionExpiredError
					) {
						return jsonError("No autorizado.", 401);
					}

					if (error instanceof WrongActorError) {
						return jsonError("Prohibido.", 403);
					}

					if (error instanceof ProblemDetailsError) {
						return jsonError(
							error.problemDetails.detail || error.problemDetails.title,
							error.problemDetails.status,
						);
					}

					return jsonError(
						"No pudimos generar el remito firmado en este momento.",
						500,
					);
				}
			},
		},
	},
});
