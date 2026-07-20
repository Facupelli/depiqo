import { isAuthError, ProblemDetailsError } from "@/shared/errors";

const PROBLEM_TYPE_BASE_URI = "https://api.depiqo.com/problems";
const INSUFFICIENT_ASSET_AVAILABILITY_TYPE = `${PROBLEM_TYPE_BASE_URI}/rental-commitment/insufficient-asset-availability`;
const UNSUPPORTED_BRANCH_FULFILLMENT_METHOD_TYPE = `${PROBLEM_TYPE_BASE_URI}/rental-commitment/unsupported-branch-fulfillment-method`;
const CREATE_RENTAL_IDEMPOTENCY_IN_PROGRESS_TYPE =
	"errors://idempotency-key-in-progress";
const CREATE_RENTAL_IDEMPOTENCY_CONFLICT_TYPE =
	"errors://idempotency-key-conflict";

type CartBookingAvailabilityConflict = {
	kind: "availability-conflict";
	message: string;
};

type CartBookingAuthError = {
	kind: "auth";
};

type CartBookingDeliveryNotSupportedError = {
	kind: "delivery-not-supported";
	message: string;
};

type CartBookingIdempotencyConflictError = {
	kind: "idempotency-conflict";
	message: string;
};

type CartBookingIdempotencyInProgressError = {
	kind: "idempotency-in-progress";
	message: string;
};

type CartBookingUnknownError = {
	kind: "unknown";
	message: string;
};

export type ParsedCartBookingError =
	| CartBookingAvailabilityConflict
	| CartBookingAuthError
	| CartBookingDeliveryNotSupportedError
	| CartBookingIdempotencyConflictError
	| CartBookingIdempotencyInProgressError
	| CartBookingUnknownError;

export function parseCartBookingError(error: unknown): ParsedCartBookingError {
	if (isInsufficientAssetAvailabilityError(error)) {
		return {
			kind: "availability-conflict",
			message:
				"No se puede completar la reserva porque algunos equipos ya no están disponibles para este período. Ajustá las cantidades del carrito y volvé a intentarlo.",
		};
	}

	if (isAuthError(error)) {
		return { kind: "auth" };
	}

	if (isDeliveryNotSupportedError(error)) {
		return {
			kind: "delivery-not-supported",
			message: "Esta sucursal solo permite retiro en el local.",
		};
	}

	if (isCreateRentalIdempotencyConflictError(error)) {
		return {
			kind: "idempotency-conflict",
			message:
				"Los datos de la reserva cambiaron durante el envío. Revisá la reserva y volvé a confirmarla.",
		};
	}

	if (isRetryableCreateRentalInProgressError(error)) {
		return {
			kind: "idempotency-in-progress",
			message:
				"Tu reserva todavía se está procesando. Esperá unos segundos y volvé a intentarlo.",
		};
	}

	return {
		kind: "unknown",
		message: "La reserva falló inesperadamente. Por favor, intentalo de nuevo.",
	};
}

function isInsufficientAssetAvailabilityError(error: unknown): boolean {
	return (
		error instanceof ProblemDetailsError &&
		error.problemDetails.type === INSUFFICIENT_ASSET_AVAILABILITY_TYPE
	);
}

function isDeliveryNotSupportedError(error: unknown): boolean {
	return (
		error instanceof ProblemDetailsError &&
		error.problemDetails.type === UNSUPPORTED_BRANCH_FULFILLMENT_METHOD_TYPE
	);
}

function isRetryableCreateRentalInProgressError(error: unknown): boolean {
	return (
		error instanceof ProblemDetailsError &&
		error.problemDetails.type === CREATE_RENTAL_IDEMPOTENCY_IN_PROGRESS_TYPE &&
		error.problemDetails.retryable === true
	);
}

function isCreateRentalIdempotencyConflictError(error: unknown): boolean {
	return (
		error instanceof ProblemDetailsError &&
		error.problemDetails.type === CREATE_RENTAL_IDEMPOTENCY_CONFLICT_TYPE
	);
}
