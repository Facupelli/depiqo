import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

export type RescheduleRentalPeriodErrorKind =
	| "stale"
	| "period-conflict"
	| "unknown";

export interface RescheduleRentalPeriodUiError {
	kind: RescheduleRentalPeriodErrorKind;
	message: string;
}

const errorsByCode = {
	"rental_commitment.rental_version_conflict": {
		kind: "stale",
		message:
			"El alquiler cambió mientras lo editabas. Revisá la información actual antes de volver a intentarlo.",
	},
	"rental_commitment.rental_cannot_be_edited_from_status": {
		kind: "stale",
		message:
			"El alquiler cambió mientras lo editabas. Revisá la información actual antes de volver a intentarlo.",
	},
	"rental_commitment.rental_period_has_started": {
		kind: "stale",
		message: "El alquiler ya comenzó y no se puede reprogramar.",
	},
	"rental_commitment.rental_not_found": {
		kind: "stale",
		message: "El alquiler ya no está disponible. Actualizá la información.",
	},
	"rental_commitment.rental_period_must_start_in_future": {
		kind: "period-conflict",
		message: "El inicio del alquiler debe ser posterior al momento actual.",
	},
	"rental_commitment.invalid_rental_period": {
		kind: "period-conflict",
		message: "El período seleccionado no es válido.",
	},
	"rental_commitment.assigned_assets_unavailable": {
		kind: "period-conflict",
		message:
			"Uno o más equipos o accesorios asignados no están disponibles en el período seleccionado.",
	},
} as const satisfies Record<
	string,
	{
		kind: Exclude<RescheduleRentalPeriodErrorKind, "unknown">;
		message: string;
	}
>;

const unknownError: RescheduleRentalPeriodUiError = {
	kind: "unknown",
	message:
		"No pudimos reprogramar el alquiler. Revisá tu conexión e intentá nuevamente.",
};

export function toRescheduleRentalPeriodUiError(
	error: unknown,
): RescheduleRentalPeriodUiError {
	if (!(error instanceof ProblemDetailsError)) {
		return unknownError;
	}

	const code = getProblemDetailsCode(error);
	if (!code || !(code in errorsByCode)) {
		return unknownError;
	}

	return errorsByCode[code as keyof typeof errorsByCode];
}
