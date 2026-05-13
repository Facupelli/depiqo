import {
	orderItemsUnavailableProblemSchema,
	type OrderItemsUnavailableProblemDto,
} from "@repo/schemas";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";
import type { OrderEditorMode } from "@/features/orders/order-editor/types/order-editor.types";
import { ProblemDetailsError } from "@/shared/errors";

type OrderActionErrorContext =
	| {
			action: "confirm";
			orderStatus: ParsedOrderDetailResponseDto["status"];
	  }
	| {
			action: "save";
			mode: OrderEditorMode;
	  };

export type ParsedOrderActionError = {
	conflict: OrderItemsUnavailableProblemDto | null;
	message: string;
};

export function extractOrderAvailabilityConflict(
	error: unknown,
): OrderItemsUnavailableProblemDto | null {
	if (!(error instanceof ProblemDetailsError)) {
		return null;
	}

	const parsed = orderItemsUnavailableProblemSchema.safeParse(error.problemDetails);
	return parsed.success ? parsed.data : null;
}

export function parseOrderActionError(
	context: OrderActionErrorContext,
	error: unknown,
): ParsedOrderActionError {
	const conflict = extractOrderAvailabilityConflict(error);

	if (context.action === "confirm") {
		return {
			conflict,
			message: getConfirmOrderErrorMessage(error, context.orderStatus, conflict),
		};
	}

	return {
		conflict,
		message: getSaveOrderErrorMessage(error, context.mode, conflict),
	};
}

function getConfirmOrderErrorMessage(
	error: unknown,
	orderStatus: ParsedOrderDetailResponseDto["status"],
	conflict: OrderItemsUnavailableProblemDto | null,
): string {
	if (conflict) {
		return (
			conflict.detail ??
			(orderStatus === "PENDING_REVIEW"
				? "No se puede aprobar la solicitud porque la disponibilidad cambió desde que fue enviada."
				: "No se puede confirmar el pedido porque algunos equipos o accesorios ya no están disponibles para este período.")
		);
	}

	if (error instanceof ProblemDetailsError) {
		switch (error.problemDetails.type) {
			case "errors://order-customer-required":
				return "Este borrador necesita un cliente vinculado antes de poder confirmarse.";
			default:
				return (
					error.problemDetails.detail ??
					error.problemDetails.title ??
					"No pudimos confirmar el pedido."
				);
		}
	}

	return "Ocurrio un error al confirmar el pedido.";
}

function getSaveOrderErrorMessage(
	error: unknown,
	mode: OrderEditorMode,
	conflict: OrderItemsUnavailableProblemDto | null,
): string {
	if (conflict) {
		return conflict.detail ?? getSaveOrderConflictFallback(mode);
	}

	if (error instanceof ProblemDetailsError) {
		return error.problemDetails.detail ?? error.problemDetails.title ?? getSaveOrderFallback(mode);
	}

	if (error instanceof Error) {
		return error.message;
	}

	return getSaveOrderFallback(mode);
}

function getSaveOrderFallback(mode: OrderEditorMode): string {
	return mode === "create-draft" || mode === "edit-draft"
		? "No pudimos guardar el borrador."
		: "No pudimos guardar los cambios del pedido.";
}

function getSaveOrderConflictFallback(mode: OrderEditorMode): string {
	return mode === "create-draft" || mode === "edit-draft"
		? "No se puede guardar el borrador porque algunos equipos o accesorios ya no están disponibles para este período."
		: "No se pueden guardar los cambios porque algunos equipos o accesorios ya no están disponibles para este período.";
}
