import { getProblemDetailsCode } from "@/shared/errors";

const deliveryErrorMessages: Record<string, string> = {
	"rental_commitment.delivery_management_permission_denied":
		"No tenés permiso para modificar las condiciones de envío.",
	"rental_commitment.delivery_not_serviceable":
		"No pudimos validar el envío para la dirección y las fechas seleccionadas. Revisá las condiciones de envío.",
	"rental_commitment.delivery_review_required":
		"Revisá el importe y las condiciones de envío desde Editar borrador.",
	"rental_commitment.delivery_evaluation_unavailable":
		"No pudimos evaluar el envío. Intentá nuevamente más tarde.",
	"rental_commitment.delivery_technical_failure":
		"No pudimos validar la dirección o calcular la ruta. Revisá las condiciones de envío.",
	"rental_commitment.current_delivery_destination_missing":
		"Falta el destino de entrega. Completalo antes de guardar.",
	"rental_commitment.invalid_rental_field":
		"Revisá los datos del alquiler, el importe y las condiciones de envío antes de continuar.",
};

export function getDeliveryErrorMessage(error: unknown): string | undefined {
	const code = getProblemDetailsCode(error);
	return code ? deliveryErrorMessages[code] : undefined;
}
