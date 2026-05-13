import { useState } from "react";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";
import { ProblemDetailsError } from "@/shared/errors";
import { useConfirmOrder } from "../orders.queries";

export function useOrderConfirmActions(order: ParsedOrderDetailResponseDto) {
	const [isConfirmOrderDialogOpen, setIsConfirmOrderDialogOpen] =
		useState(false);
	const [confirmOrderError, setConfirmOrderError] = useState<string | null>(
		null,
	);
	const { mutateAsync: confirmOrder, isPending: isConfirmingOrder } =
		useConfirmOrder();

	const handleConfirmOrder = () => {
		setConfirmOrderError(null);
		setIsConfirmOrderDialogOpen(true);
	};

	const handleConfirmOrderSubmission = async () => {
		setConfirmOrderError(null);

		if (!order.customer) {
			setConfirmOrderError(
				"Este borrador necesita un cliente vinculado antes de poder confirmarse.",
			);
			return;
		}

		try {
			await confirmOrder({ orderId: order.id });
			setIsConfirmOrderDialogOpen(false);
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				setConfirmOrderError(getConfirmOrderErrorMessage(error, order.status));
				return;
			}

			setConfirmOrderError("Ocurrio un error al confirmar el pedido.");
		}
	};

	const setIsConfirmOrderDialogOpenWithReset = (open: boolean) => {
		if (!open) {
			setConfirmOrderError(null);
		}

		setIsConfirmOrderDialogOpen(open);
	};

	return {
		confirmOrderError,
		isConfirmOrderDialogOpen,
		isConfirmOrderPending: isConfirmingOrder,
		handleConfirmOrder,
		handleConfirmOrderSubmission,
		setIsConfirmOrderDialogOpen: setIsConfirmOrderDialogOpenWithReset,
	};
}

function getConfirmOrderErrorMessage(
	error: ProblemDetailsError,
	orderStatus: ParsedOrderDetailResponseDto["status"],
): string {
	const fallbackMessage =
		error.problemDetails.detail ??
		error.problemDetails.title ??
		"No pudimos confirmar el pedido.";

	switch (error.problemDetails.type) {
		case "errors://order-customer-required":
			return "Este borrador necesita un cliente vinculado antes de poder confirmarse.";
		case "errors://order-items-unavailable":
			return orderStatus === "PENDING_REVIEW"
				? (
						error.problemDetails.detail ??
						"No pudimos aprobar el pedido porque la disponibilidad cambió desde que se envió la solicitud. Uno o más equipos ya no estan disponibles para este periodo."
					)
				: (
						error.problemDetails.detail ??
						"No pudimos confirmar el borrador porque uno o más equipos ya no estan disponibles para este periodo."
					);
		default:
			return fallbackMessage;
	}
}
