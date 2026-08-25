import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

export type AddSelectionUiError = {
	message: string;
	shouldRefreshDetail: boolean;
	shouldRefreshAvailability: boolean;
};

export function toAddSelectionUiError(error: unknown): AddSelectionUiError {
	if (!(error instanceof ProblemDetailsError)) {
		return {
			message:
				"No pudimos agregar el producto. Revisá tu conexión e intentá nuevamente.",
			shouldRefreshDetail: false,
			shouldRefreshAvailability: false,
		};
	}

	const code = getProblemDetailsCode(error);

	if (code === "rental_commitment.rental_version_conflict") {
		return {
			message:
				"El pedido cambió mientras agregabas el producto. Actualizamos la información; revisá los datos e intentá nuevamente.",
			shouldRefreshDetail: true,
			shouldRefreshAvailability: true,
		};
	}

	if (code === "rental_commitment.duplicate_rental_offer_selection") {
		return {
			message:
				"Este producto ya fue agregado al pedido. Actualizamos la información; elegí otro producto si lo necesitás.",
			shouldRefreshDetail: true,
			shouldRefreshAvailability: false,
		};
	}

	if (code === "rental_commitment.insufficient_asset_availability") {
		return {
			message:
				"No hay suficientes unidades disponibles para el período del pedido. Actualizamos la disponibilidad; ajustá la cantidad e intentá nuevamente.",
			shouldRefreshDetail: false,
			shouldRefreshAvailability: true,
		};
	}

	if (code === "rental_commitment.catalog_selection_unavailable") {
		return {
			message:
				"Este producto ya no está disponible para alquilar. Actualizamos la información; elegí otro producto.",
			shouldRefreshDetail: false,
			shouldRefreshAvailability: true,
		};
	}

	if (code === "rental_commitment.rental_cannot_be_edited_from_status") {
		return {
			message:
				"El estado actual del pedido no permite agregar productos. Actualizá la página e intentá nuevamente.",
			shouldRefreshDetail: true,
			shouldRefreshAvailability: false,
		};
	}

	return {
		message: "No pudimos agregar el producto. Intentá nuevamente.",
		shouldRefreshDetail: false,
		shouldRefreshAvailability: false,
	};
}
