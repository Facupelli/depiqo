import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

export interface EditPriceAdjustmentUiError {
	message: string;
	shouldRefreshDetail: boolean;
}

const messages = {
	"rental_commitment.rental_version_conflict":
		"El pedido cambió mientras editabas. Actualizamos la información; revisala antes de intentar nuevamente.",
	"rental_commitment.rental_cannot_be_edited_from_status":
		"El estado actual del pedido no permite ajustar el precio.",
	"rental_commitment.rental_period_ended":
		"No se puede ajustar el precio porque el período del alquiler ya terminó.",
	"rental_commitment.invalid_pricing_input":
		"El total acordado no es válido para este pedido.",
	"rental_commitment.invalid_rental_field":
		"Los datos del ajuste de precio no son válidos.",
	"rental_commitment.rental_not_found":
		"No encontramos el pedido. Actualizá la página e intentá nuevamente.",
} as const;

export function toEditPriceAdjustmentUiError(
	error: unknown,
): EditPriceAdjustmentUiError {
	if (!(error instanceof ProblemDetailsError)) {
		return {
			message:
				"No pudimos ajustar el precio. Revisá tu conexión e intentá nuevamente.",
			shouldRefreshDetail: false,
		};
	}

	const code = getProblemDetailsCode(error);
	return {
		message:
			code && code in messages
				? messages[code as keyof typeof messages]
				: "No pudimos ajustar el precio. Intentá nuevamente.",
		shouldRefreshDetail:
			code === "rental_commitment.rental_version_conflict" ||
			code === "rental_commitment.rental_not_found",
	};
}
