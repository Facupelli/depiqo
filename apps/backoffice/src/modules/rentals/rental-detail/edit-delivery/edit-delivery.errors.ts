import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

const messages = {
	"rental_commitment.rental_version_conflict":
		"El alquiler cambió mientras editabas. Cerrá este diálogo y revisá los datos actualizados antes de volver a editar.",
	"rental_commitment.rental_cannot_be_edited_from_status":
		"El alquiler ya no está confirmado. No se pueden cambiar sus condiciones de entrega.",
	"rental_commitment.rental_period_started":
		"Ya se alcanzó el inicio programado. No se pueden cambiar las condiciones de entrega.",
	"rental_commitment.delivery_management_permission_denied":
		"No tenés permiso para modificar las condiciones de entrega.",
	"rental_commitment.invalid_rental_field":
		"Revisá la dirección, la decisión de precio y los minutos. Si la sucursal tiene minutos configurados, deben coincidir con esa configuración. No se puede conservar un acuerdo al cambiar de modalidad ni quitarlo de una entrega coordinada.",
	"rental_commitment.delivery_not_serviceable":
		"No se pudo aceptar la entrega. Revisá el destino y las restricciones de la sucursal. Una excepción autorizada no permite omitir una ruta o ubicación válida.",
	"rental_commitment.delivery_evaluation_unavailable":
		"No pudimos resolver la ubicación o calcular la ruta. Conservamos tus cambios; intentá nuevamente más tarde.",
	"rental_commitment.assigned_assets_unavailable":
		"Los nuevos minutos generan un conflicto con otra reserva de equipos. Revisá los minutos o la asignación de equipos antes de reintentar.",
	"rental_commitment.unsafe_delivery_reservation_change":
		"No se pueden cambiar los minutos porque afectaría reservas históricas de equipos. Conservá los minutos actuales.",
	"rental_commitment.rental_not_found":
		"No encontramos el alquiler. Actualizá la página.",
} as const;

export function toEditDeliveryError(error: unknown) {
	const code =
		error instanceof ProblemDetailsError
			? getProblemDetailsCode(error)
			: undefined;
	return {
		message:
			code && code in messages
				? messages[code as keyof typeof messages]
				: error instanceof ProblemDetailsError &&
						error.problemDetails.status === 403
					? "No tenés permiso para modificar las condiciones de entrega."
					: "No pudimos guardar las condiciones de entrega. Revisá tu conexión e intentá nuevamente.",
		stale: code === "rental_commitment.rental_version_conflict",
		blocked:
			(error instanceof ProblemDetailsError &&
				error.problemDetails.status === 403) ||
			code === "rental_commitment.rental_period_started" ||
			code === "rental_commitment.rental_cannot_be_edited_from_status" ||
			code === "rental_commitment.delivery_management_permission_denied",
	};
}
