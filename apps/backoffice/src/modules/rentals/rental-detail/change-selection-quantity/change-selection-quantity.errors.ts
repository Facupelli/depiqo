import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

export interface ChangeSelectionQuantityUiError {
	message: string;
	shouldRefreshDetail: boolean;
	shouldRefreshAvailability: boolean;
}

const messages = {
	"rental_commitment.rental_not_found":
		"No encontramos el pedido. Actualizá la página e intentá nuevamente.",
	"rental_commitment.rental_selection_not_found":
		"El producto ya no pertenece al pedido. Actualizamos la información para que puedas revisarla.",
	"rental_commitment.rental_cannot_be_edited_from_status":
		"El estado actual del pedido no permite cambiar cantidades.",
	"rental_commitment.rental_period_ended":
		"No se puede cambiar la cantidad porque el período del alquiler ya terminó.",
	"rental_commitment.insufficient_asset_availability":
		"Ya no hay suficientes unidades disponibles. Actualizamos la disponibilidad; ajustá la cantidad e intentá nuevamente.",
	"rental_commitment.invalid_pricing_input":
		"No pudimos recalcular el precio con esa cantidad. Revisá el pedido e intentá nuevamente.",
	"rental_commitment.rental_version_conflict":
		"El pedido cambió mientras editabas. Actualizamos la información; revisala antes de intentar nuevamente.",
	"rental_commitment.invalid_rental_field":
		"La cantidad o los equipos seleccionados para liberar no son válidos.",
} as const;

export function toChangeSelectionQuantityUiError(
	error: unknown,
): ChangeSelectionQuantityUiError {
	if (!(error instanceof ProblemDetailsError)) {
		return {
			message:
				"No pudimos cambiar la cantidad. Revisá tu conexión e intentá nuevamente.",
			shouldRefreshDetail: false,
			shouldRefreshAvailability: false,
		};
	}

	const code = getProblemDetailsCode(error);
	const message =
		code && code in messages
			? messages[code as keyof typeof messages]
			: "No pudimos cambiar la cantidad. Intentá nuevamente.";

	return {
		message,
		shouldRefreshDetail:
			code === "rental_commitment.rental_version_conflict" ||
			code === "rental_commitment.rental_selection_not_found" ||
			code === "rental_commitment.rental_not_found",
		shouldRefreshAvailability:
			code === "rental_commitment.insufficient_asset_availability" ||
			code === "rental_commitment.rental_version_conflict",
	};
}
