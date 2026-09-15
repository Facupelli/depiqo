import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

export interface RemovePackageDemandLineUiError {
	message: string;
	shouldRefreshDetail: boolean;
}

const messages = {
	"rental_commitment.rental_not_found":
		"No encontramos el alquiler. Actualizá la página e intentá nuevamente.",
	"rental_commitment.rental_demand_line_not_found":
		"El equipo ya no forma parte del combo. Actualizamos la información para que puedas revisarla.",
	"rental_commitment.rental_demand_line_referenced_by_accessory":
		"No podés quitar este equipo porque tiene accesorios asignados. Quitá o reasigná esos accesorios primero.",
	"rental_commitment.rental_period_ended":
		"No se puede quitar el equipo porque el período del alquiler ya terminó.",
	"rental_commitment.rental_cannot_be_edited_from_status":
		"El estado actual del alquiler no permite quitar equipos del combo.",
	"rental_commitment.rental_version_conflict":
		"El alquiler cambió mientras editabas. Actualizamos la información; revisala antes de intentar nuevamente.",
	"rental_commitment.invalid_rental_field":
		"Este equipo no puede quitarse del combo en el estado actual del alquiler.",
} as const;

export function toRemovePackageDemandLineUiError(
	error: unknown,
): RemovePackageDemandLineUiError {
	if (!(error instanceof ProblemDetailsError)) {
		return {
			message:
				"No pudimos quitar el equipo del combo. Revisá tu conexión e intentá nuevamente.",
			shouldRefreshDetail: false,
		};
	}

	const code = getProblemDetailsCode(error);
	return {
		message:
			code && code in messages
				? messages[code as keyof typeof messages]
				: "No pudimos quitar el equipo del combo. Intentá nuevamente.",
		shouldRefreshDetail:
			code === "rental_commitment.rental_version_conflict" ||
			code === "rental_commitment.rental_demand_line_not_found" ||
			code === "rental_commitment.rental_not_found",
	};
}
