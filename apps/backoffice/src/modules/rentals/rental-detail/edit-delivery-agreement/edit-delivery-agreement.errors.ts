import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

const messages = {
	"rental_commitment.rental_version_conflict":
		"El alquiler cambió mientras editabas. Cerrá este diálogo y revisá la información actualizada antes de volver a editar.",
	"rental_commitment.rental_cannot_be_edited_from_status":
		"El estado actual del alquiler no permite cambiar el precio de entrega y retiro.",
	"rental_commitment.rental_period_ended":
		"El período del alquiler ya terminó. No se puede cambiar el precio de entrega y retiro.",
	"rental_commitment.invalid_rental_field":
		"Revisá el importe. No se puede quitar un acuerdo si no hay un precio calculado de referencia.",
	"rental_commitment.rental_not_found":
		"No encontramos el pedido. Actualizá la página.",
} as const;

export function toDeliveryAgreementError(error: unknown) {
	const code =
		error instanceof ProblemDetailsError
			? getProblemDetailsCode(error)
			: undefined;
	return {
		message:
			code && code in messages
				? messages[code as keyof typeof messages]
				: "No pudimos cambiar el precio de entrega y retiro. Revisá tu conexión e intentá nuevamente.",
		stale: code === "rental_commitment.rental_version_conflict",
	};
}
