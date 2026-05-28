import type { OrderItemsUnavailableProblemDto } from "@repo/schemas";
import { useState } from "react";
import { parseOrderActionError } from "@/features/orders/order-action-errors";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";
import { useConfirmOrder } from "../orders.mutations";

export function useOrderConfirmActions(order: ParsedOrderDetailResponseDto) {
	const [isConfirmOrderDialogOpen, setIsConfirmOrderDialogOpen] =
		useState(false);
	const [confirmOrderError, setConfirmOrderError] = useState<string | null>(
		null,
	);
	const [confirmOrderConflict, setConfirmOrderConflict] =
		useState<OrderItemsUnavailableProblemDto | null>(null);
	const { mutateAsync: confirmOrder, isPending: isConfirmingOrder } =
		useConfirmOrder();

	const handleConfirmOrder = () => {
		setConfirmOrderError(null);
		setConfirmOrderConflict(null);
		setIsConfirmOrderDialogOpen(true);
	};

	const handleConfirmOrderSubmission = async () => {
		setConfirmOrderError(null);
		setConfirmOrderConflict(null);

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
			const parsedError = parseOrderActionError(
				{ action: "confirm", orderStatus: order.status },
				error,
			);
			setConfirmOrderConflict(parsedError.conflict);
			setConfirmOrderError(parsedError.message);
		}
	};

	const setIsConfirmOrderDialogOpenWithReset = (open: boolean) => {
		if (!open) {
			setConfirmOrderError(null);
			setConfirmOrderConflict(null);
		}

		setIsConfirmOrderDialogOpen(open);
	};

	return {
		confirmOrderConflict,
		confirmOrderError,
		isConfirmOrderDialogOpen,
		isConfirmOrderPending: isConfirmingOrder,
		handleConfirmOrder,
		handleConfirmOrderSubmission,
		setIsConfirmOrderDialogOpen: setIsConfirmOrderDialogOpenWithReset,
	};
}
