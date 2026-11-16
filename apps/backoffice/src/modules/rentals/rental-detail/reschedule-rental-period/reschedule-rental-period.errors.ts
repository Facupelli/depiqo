import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

export type RescheduleRentalPeriodErrorKind =
	| "stale"
	| "period-conflict"
	| "delivery-review"
	| "unknown";

export interface RescheduleRentalPeriodUiError {
	kind: RescheduleRentalPeriodErrorKind;
	message: string;
}

const errorsByCode = {
	"rental_commitment.delivery_review_required": {
		kind: "delivery-review",
		message:
			"Cambiaron el precio o las condiciones de envío. Volvé a revisar antes de guardar.",
	},
	"rental_commitment.delivery_evaluation_unavailable": {
		kind: "delivery-review",
		message:
			"El cálculo de la ruta no está disponible temporalmente. Volvé a intentar la revisión.",
	},
	"rental_commitment.delivery_technical_failure": {
		kind: "delivery-review",
		message:
			"No pudimos validar la entrega y el retiro. Revisá la sucursal, el destino y la ruta antes de volver a intentar la revisión.",
	},
	"rental_commitment.delivery_exception_authorization_required": {
		kind: "delivery-review",
		message:
			"Falta autorizar la excepción a las condiciones de envío. Revisala y autorizala antes de guardar.",
	},
	"rental_commitment.delivery_exception_permission_denied": {
		kind: "delivery-review",
		message:
			"No tenés permiso para autorizar esta excepción a las condiciones de envío.",
	},
	"rental_commitment.invalid_rescheduling_delivery_input": {
		kind: "delivery-review",
		message:
			"Las condiciones de envío están incompletas o cambiaron. Volvé a revisarlas antes de guardar.",
	},
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
		message:
			"No se puede aplicar el período propuesto. Revisá las fechas, las reservas y las asignaciones de equipos antes de volver a intentar.",
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
