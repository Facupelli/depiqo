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
	"rental_commitment.demand_line_not_part_of_package":
		"Este equipo no pertenece a un combo y no puede quitarse con esta acción.",
	"rental_commitment.package_must_retain_demand_line":
		"No podés quitar este equipo porque el combo debe conservar al menos un equipo.",
	"rental_commitment.invalid_package_demand_line_removal_quantity":
		"La cantidad de equipos a quitar no es válida.",
	"rental_commitment.release_asset_count_mismatch":
		"La selección de unidades no coincide con la cantidad que querés quitar.",
	"rental_commitment.duplicate_release_asset_ids":
		"No podés seleccionar la misma unidad más de una vez.",
	"rental_commitment.release_asset_demand_line_mismatch":
		"Una de las unidades seleccionadas ya no pertenece a este equipo del combo. Actualizá el alquiler e intentá nuevamente.",
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
			code === "rental_commitment.rental_not_found" ||
			code === "rental_commitment.release_asset_demand_line_mismatch",
	};
}
