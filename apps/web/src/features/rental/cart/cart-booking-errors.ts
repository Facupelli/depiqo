import {
	orderItemsUnavailableProblemSchema,
	type OrderItemsUnavailableProblemDto,
} from "@repo/schemas";
import { isAuthError, ProblemDetailsError } from "@/shared/errors";
import type { ConflictGroup } from "./cart.types";

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

type CartBookingUnknownError = {
	kind: "unknown";
	message: string;
};

export type ParsedCartBookingError =
	| CartBookingAvailabilityConflict
	| CartBookingAuthError
	| CartBookingDeliveryNotSupportedError
	| CartBookingUnknownError;

export function parseCartBookingError(error: unknown): ParsedCartBookingError {
	const conflict = extractCartBookingAvailabilityConflict(error);
	if (conflict) {
		const { unavailableIds, conflictGroups } = toCartAvailabilityConflictState(conflict);
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

	return {
		kind: "unknown",
		message:
			"La reserva falló inesperadamente. Por favor, intentalo de nuevo.",
	};
}

export function extractCartBookingAvailabilityConflict(
	error: unknown,
): OrderItemsUnavailableProblemDto | null {
	if (!(error instanceof ProblemDetailsError)) {
		return null;
	}

	const parsed = orderItemsUnavailableProblemSchema.safeParse(error.problemDetails);
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
