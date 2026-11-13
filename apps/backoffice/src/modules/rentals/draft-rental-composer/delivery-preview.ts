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
		"El retiro está fuera del horario de servicio.",
};
export const deliveryRequirementLabels: Record<
	PreviewDraftRentalCostDeliveryDto["requirements"][number],
	string
> = {
	DESTINATION_REQUIRED: "Seleccioná una dirección de entrega de la lista.",
	AGREEMENT_DECISION_REQUIRED:
		"Cambiaron las condiciones de envío. Revisá el importe definido.",
	AGREEMENT_REQUIRED:
		"No hay un precio calculado disponible. Definí el importe de entrega y retiro.",
	INVALID_AGREEMENT_AMOUNT:
		"Ingresá un importe de 0 o más, con hasta 2 decimales.",
	KEEP_REQUIRES_EXISTING_AGREEMENT:
		"No hay un importe definido para conservar.",
	AUTOMATIC_QUOTE_REQUIRED:
		"No hay un precio calculado disponible para reemplazar el importe definido.",
	CURRENCY_DECISION_REQUIRED:
		"Cambió la moneda. Definí otro importe o usá el precio calculado.",
	CURRENCY_MISMATCH: "La moneda del envío no coincide con la del alquiler.",
	TRANSPORT_RESERVATION_MINUTES_REQUIRED:
		"Ingresá el tiempo para transporte en minutos. Puede ser 0.",
	TRANSPORT_RESERVATION_MINUTES_CONFLICT:
		"Usá el tiempo para transporte de la sucursal. Dejá el campo vacío para aplicarlo.",
};
const technicalFailureLabels: Record<
	NonNullable<PreviewDraftRentalCostDeliveryDto["technicalFailure"]>,
	string
> = {
	BRANCH_UNAVAILABLE: "La sucursal no está disponible para el envío.",
	BRANCH_LOCATION_MISSING: "La sucursal no tiene una ubicación configurada.",
	CUSTOMER_LOCATION_UNRESOLVED:
		"No pudimos identificar la ubicación de entrega.",
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
						? "El importe está definido. Configurá la ubicación de la sucursal para validar el envío."
						: technicalFailureLabels[delivery.technicalFailure],
				]
			: []),
		...delivery.requirements.map(
			(requirement) => deliveryRequirementLabels[requirement],
		),
	];
}
