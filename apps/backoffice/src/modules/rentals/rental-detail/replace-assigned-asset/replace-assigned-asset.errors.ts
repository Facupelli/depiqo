import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

export interface ReplaceAssignedAssetUiError {
	message: string;
	refreshCandidates: boolean;
	refreshDetail: boolean;
	closeAsStale: boolean;
}

const messages = {
	"rental_commitment.rental_not_found":
		"No encontramos el pedido. Actualizá la página e intentá nuevamente.",
	"rental_commitment.rental_cannot_be_edited_from_status":
		"El estado actual del pedido no permite reemplazar equipos.",
	"rental_commitment.rental_period_ended":
		"No se puede reemplazar el equipo porque el período del alquiler ya terminó.",
	"rental_commitment.rental_asset_assignment_not_found":
		"Esta asignación ya no existe. Actualizamos la información del pedido.",
	"rental_commitment.replacement_asset_unavailable":
		"El equipo seleccionado dejó de estar disponible. Elegí otro equipo de la lista actualizada.",
	"rental_commitment.rental_version_conflict":
		"El pedido cambió mientras lo editabas. Actualizamos la información; revisala antes de intentar nuevamente.",
	"rental_commitment.invalid_rental_field":
		"No se puede reemplazar este equipo con los datos actuales del pedido.",
} as const;

export function toReplaceAssignedAssetUiError(
	error: unknown,
): ReplaceAssignedAssetUiError {
	if (!(error instanceof ProblemDetailsError)) {
		return {
			message:
				"No pudimos reemplazar el equipo. Revisá tu conexión e intentá nuevamente.",
			refreshCandidates: false,
			refreshDetail: false,
			closeAsStale: false,
		};
	}

	const code = getProblemDetailsCode(error);
	return {
		message:
			code && code in messages
				? messages[code as keyof typeof messages]
				: "No pudimos reemplazar el equipo. Intentá nuevamente.",
		refreshCandidates:
			code === "rental_commitment.replacement_asset_unavailable",
		refreshDetail:
			code === "rental_commitment.rental_version_conflict" ||
			code === "rental_commitment.rental_asset_assignment_not_found" ||
			code === "rental_commitment.rental_not_found",
		closeAsStale:
			code === "rental_commitment.rental_asset_assignment_not_found",
	};
}
