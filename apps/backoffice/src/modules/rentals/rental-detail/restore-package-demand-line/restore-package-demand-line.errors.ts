import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

export interface RestorePackageDemandLineUiError {
	message: string;
	shouldRefreshDetail: boolean;
}

const messages = {
	"rental_commitment.rental_not_found":
		"No encontramos el alquiler. Actualizá la página e intentá nuevamente.",
	"rental_commitment.rental_demand_line_not_found":
		"No encontramos el equipo quitado. Actualizamos la información para que puedas revisarla.",
	"rental_commitment.rental_demand_line_already_current":
		"El equipo ya está incluido en el combo. Actualizamos la información para que puedas revisarla.",
	"rental_commitment.insufficient_asset_availability":
		"No hay una unidad compatible disponible para el resto del período del alquiler. El equipo no se restauró; intentá nuevamente más adelante.",
	"rental_commitment.rental_period_ended":
		"No se puede restaurar el equipo porque el período del alquiler ya terminó.",
	"rental_commitment.rental_cannot_be_edited_from_status":
		"El estado actual del alquiler no permite restaurar equipos del combo.",
	"rental_commitment.rental_version_conflict":
		"El alquiler cambió mientras editabas. Actualizamos la información; revisala antes de intentar nuevamente.",
	"rental_commitment.invalid_rental_field":
		"Este equipo no puede restaurarse en el estado actual del alquiler.",
} as const;

export function toRestorePackageDemandLineUiError(
	error: unknown,
): RestorePackageDemandLineUiError {
	if (!(error instanceof ProblemDetailsError)) {
		return {
			message:
				"No pudimos restaurar el equipo. Revisá tu conexión e intentá nuevamente.",
			shouldRefreshDetail: false,
		};
	}

	const code = getProblemDetailsCode(error);
	return {
		message:
			code && code in messages
				? messages[code as keyof typeof messages]
				: "No pudimos restaurar el equipo. Intentá nuevamente.",
		shouldRefreshDetail:
			code === "rental_commitment.rental_version_conflict" ||
			code === "rental_commitment.rental_demand_line_not_found" ||
			code === "rental_commitment.rental_demand_line_already_current" ||
			code === "rental_commitment.rental_not_found",
	};
}
