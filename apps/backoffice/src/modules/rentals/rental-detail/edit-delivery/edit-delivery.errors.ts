import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

const messages = {
	"rental_commitment.rental_version_conflict":
		"El alquiler cambió mientras editabas. Cerrá este diálogo y revisá los datos actualizados antes de volver a editar.",
	"rental_commitment.rental_cannot_be_edited_from_status":
		"El alquiler ya no está confirmado. No se pueden cambiar sus condiciones de entrega.",
	"rental_commitment.rental_period_started":
		"Ya pasó la hora de inicio del alquiler. No se pueden cambiar las condiciones de entrega.",
	"rental_commitment.delivery_management_permission_denied":
		"No tenés permiso para modificar las condiciones de entrega.",
	"rental_commitment.invalid_rental_field":
		"Revisá el destino, el importe y el tiempo para transporte antes de guardar.",
	"rental_commitment.delivery_not_serviceable":
		"No pudimos validar el envío. Revisá la dirección y las restricciones de la sucursal. Una excepción no reemplaza la validación de la dirección y la ruta.",
	"rental_commitment.delivery_evaluation_unavailable":
		"No pudimos validar la dirección o calcular la ruta. Tus cambios siguen en este editor, pero no se guardaron. Intentá nuevamente más tarde.",
	"rental_commitment.assigned_assets_unavailable":
		"El tiempo para transporte coincide con otra reserva de equipos. Revisá el tiempo o las asignaciones antes de reintentar.",
	"rental_commitment.unsafe_delivery_reservation_change":
		"No se puede cambiar el tiempo para transporte de este alquiler. Conservá el tiempo actual.",
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
