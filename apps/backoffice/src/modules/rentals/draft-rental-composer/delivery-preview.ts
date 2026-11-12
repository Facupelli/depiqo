import type { PreviewDraftRentalCostDeliveryDto } from "@repo/api-contracts";

export const deliveryRestrictionLabels: Record<
	PreviewDraftRentalCostDeliveryDto["restrictions"][number],
	string
> = {
	NOT_CONFIGURED: "El servicio de envío no está configurado.",
	DISABLED: "El servicio de envío está deshabilitado.",
	BEYOND_MAX_DISTANCE: "La dirección supera la distancia máxima de envío.",
	DELIVERY_OUTSIDE_SERVICE_HOURS:
		"La entrega está fuera del horario de servicio.",
	COLLECTION_OUTSIDE_SERVICE_HOURS:
		"La recolección está fuera del horario de servicio.",
};
export const deliveryRequirementLabels: Record<
	PreviewDraftRentalCostDeliveryDto["requirements"][number],
	string
> = {
	DESTINATION_REQUIRED: "Seleccioná una dirección de envío válida.",
	AGREEMENT_DECISION_REQUIRED:
		"Cambiaron las condiciones de transporte. Revisá el importe acordado.",
	AGREEMENT_REQUIRED:
		"Sin cotización automática, necesitás acordar un importe de entrega y recolección.",
	INVALID_AGREEMENT_AMOUNT:
		"Ingresá un importe no negativo, con hasta dos decimales.",
	KEEP_REQUIRES_EXISTING_AGREEMENT:
		"No hay un acuerdo guardado para conservar.",
	AUTOMATIC_QUOTE_REQUIRED:
		"No hay una cotización automática disponible para quitar el acuerdo.",
	CURRENCY_DECISION_REQUIRED:
		"Cambió la moneda. Definí otro importe o usá el precio automático.",
	CURRENCY_MISMATCH: "La moneda del envío no coincide con la del alquiler.",
	TRANSPORT_RESERVATION_MINUTES_REQUIRED:
		"Ingresá los minutos de reserva para transporte, incluyendo cero.",
	TRANSPORT_RESERVATION_MINUTES_CONFLICT:
		"Los minutos deben coincidir con la configuración. Quitá el valor ingresado para usarla.",
};
const technicalFailureLabels: Record<
	NonNullable<PreviewDraftRentalCostDeliveryDto["technicalFailure"]>,
	string
> = {
	BRANCH_UNAVAILABLE: "La sucursal no está disponible para el envío.",
	BRANCH_LOCATION_MISSING: "La sucursal no tiene una ubicación configurada.",
	CUSTOMER_LOCATION_UNRESOLVED: "No se pudo resolver la ubicación de destino.",
	NO_ROUTE: "No se encontró una ruta hasta el destino.",
	INVALID_PERIOD: "El período no es válido para el transporte.",
};
// An amount returned alongside an agreement issue is stored context only.
export function getAcknowledgedDeliveryAgreementAmount(
	delivery: PreviewDraftRentalCostDeliveryDto | null | undefined,
): string | null {
	if (!delivery) return null;
	const agreementUnresolved = delivery.requirements.some((requirement) =>
		[
			"AGREEMENT_DECISION_REQUIRED",
			"AGREEMENT_REQUIRED",
			"INVALID_AGREEMENT_AMOUNT",
			"KEEP_REQUIRES_EXISTING_AGREEMENT",
			"AUTOMATIC_QUOTE_REQUIRED",
			"CURRENCY_DECISION_REQUIRED",
			"CURRENCY_MISMATCH",
		].includes(requirement),
	);
	return agreementUnresolved ? null : delivery.staffAgreedAmount;
}

export function deliveryBlockingMessages(
	delivery: PreviewDraftRentalCostDeliveryDto | null | undefined,
) {
	if (!delivery) return [];
	return [
		...(delivery.technicalFailure
			? [
					delivery.technicalFailure === "BRANCH_LOCATION_MISSING" &&
					getAcknowledgedDeliveryAgreementAmount(delivery) !== null
						? "El precio manual está definido. Configurá la ubicación de la sucursal para validar el transporte y crear el borrador."
						: technicalFailureLabels[delivery.technicalFailure],
				]
			: []),
		...delivery.requirements.map(
			(requirement) => deliveryRequirementLabels[requirement],
		),
	];
}
