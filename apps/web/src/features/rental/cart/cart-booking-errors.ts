import {
	type OrderItemsUnavailableProblemDto,
	orderItemsUnavailableProblemSchema,
} from "@repo/schemas";
import { isAuthError, ProblemDetailsError } from "@/shared/errors";
import type { ConflictGroup } from "./cart.types";
import {
	isCreateOrderIdempotencyConflictError,
	isRetryableCreateOrderInProgressError,
} from "./cart-order-idempotency.errors";

type CartBookingAvailabilityConflict = {
	kind: "availability-conflict";
	conflict: OrderItemsUnavailableProblemDto;
	unavailableIds: string[];
	conflictGroups: ConflictGroup[];
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
	const conflict = extractCartBookingAvailabilityConflict(error);
	if (conflict) {
		const { unavailableIds, conflictGroups } =
			toCartAvailabilityConflictState(conflict);
		return {
			kind: "availability-conflict",
			conflict,
			unavailableIds,
			conflictGroups,
			message:
				conflict.detail ??
				"No se puede completar la reserva porque algunos equipos o accesorios ya no están disponibles para este período.",
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

	if (isCreateOrderIdempotencyConflictError(error)) {
		return {
			kind: "idempotency-conflict",
			message:
				"Los datos de la reserva cambiaron durante el envío. Revisá la reserva y volvé a confirmarla.",
		};
	}

	if (isRetryableCreateOrderInProgressError(error)) {
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

export function extractCartBookingAvailabilityConflict(
	error: unknown,
): OrderItemsUnavailableProblemDto | null {
	if (!(error instanceof ProblemDetailsError)) {
		return null;
	}

	const parsed = orderItemsUnavailableProblemSchema.safeParse(
		error.problemDetails,
	);
	return parsed.success ? parsed.data : null;
}

export function toCartAvailabilityConflictState(
	conflict: OrderItemsUnavailableProblemDto,
): {
	unavailableIds: string[];
	conflictGroups: ConflictGroup[];
} {
	return {
		unavailableIds: conflict.unavailableItems
			.map((item) =>
				item.type === "PRODUCT" ? item.productTypeId : item.bundleId,
			)
			.filter(Boolean),
		conflictGroups: conflict.conflictGroups,
	};
}

function isDeliveryNotSupportedError(error: unknown) {
	return (
		error instanceof ProblemDetailsError &&
		error.problemDetails.type === "errors://delivery-not-supported"
	);
}
