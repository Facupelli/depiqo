import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

export interface RemoveSelectionUiError {
	message: string;
	shouldRefreshDetail: boolean;
	isVersionConflict: boolean;
}

const messages = {
	"rental_commitment.rental_not_found":
		"No encontramos el pedido. Actualizá la página e intentá nuevamente.",
	"rental_commitment.rental_selection_not_found":
		"El producto ya no pertenece al pedido. Actualizamos la información para que puedas revisarla.",
	"rental_commitment.rental_cannot_be_edited_from_status":
		"El estado actual del pedido no permite eliminar productos.",
	"rental_commitment.rental_requires_selection":
		"El pedido debe contener al menos un producto.",
	"rental_commitment.rental_period_ended":
		"No se puede eliminar el producto porque el período del alquiler ya terminó.",
	"rental_commitment.rental_selection_referenced_by_accessory":
		"Quitá o reasigná los accesorios asociados antes de eliminar este producto.",
	"rental_commitment.invalid_pricing_input":
		"No pudimos recalcular el precio del pedido sin este producto.",
	"rental_commitment.rental_version_conflict":
		"El pedido cambió mientras lo editabas. Actualizamos la información; revisala antes de intentar nuevamente.",
	"rental_commitment.invalid_rental_field":
		"El producto no puede eliminarse del pedido en su estado actual.",
} as const;

export function toRemoveSelectionUiError(
	error: unknown,
): RemoveSelectionUiError {
	if (!(error instanceof ProblemDetailsError)) {
		return {
			message:
				"No pudimos eliminar el producto. Revisá tu conexión e intentá nuevamente.",
			shouldRefreshDetail: false,
			isVersionConflict: false,
		};
	}

	const code = getProblemDetailsCode(error);
	return {
		message:
			code && code in messages
				? messages[code as keyof typeof messages]
				: "No pudimos eliminar el producto. Intentá nuevamente.",
		shouldRefreshDetail:
			code === "rental_commitment.rental_version_conflict" ||
			code === "rental_commitment.rental_selection_not_found" ||
			code === "rental_commitment.rental_not_found",
		isVersionConflict: code === "rental_commitment.rental_version_conflict",
	};
}
