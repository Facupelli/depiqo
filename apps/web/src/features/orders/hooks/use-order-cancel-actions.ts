import { useState } from "react";
import { ProblemDetailsError } from "@/shared/errors";
import { useCancelOrder } from "../orders.mutations";

export function useOrderCancelActions(orderId: string) {
	const [isCancelOrderDialogOpen, setIsCancelOrderDialogOpen] = useState(false);
	const [cancelOrderError, setCancelOrderError] = useState<string | null>(null);
	const { mutateAsync: cancelOrder, isPending: isCancellingOrder } =
		useCancelOrder();

	const handleOpenCancelOrder = () => {
		setCancelOrderError(null);
		setIsCancelOrderDialogOpen(true);
	};

	const handleConfirmCancelOrder = async () => {
		setCancelOrderError(null);

		try {
			await cancelOrder({ orderId });
			setIsCancelOrderDialogOpen(false);
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				setCancelOrderError(
					error.problemDetails.detail ??
						error.problemDetails.title ??
						"No pudimos cancelar el pedido.",
				);
				return;
			}

			setCancelOrderError("Ocurrio un error al cancelar el pedido.");
		}
	};

	const setIsCancelOrderDialogOpenWithReset = (open: boolean) => {
		if (!open) {
			setCancelOrderError(null);
		}

		setIsCancelOrderDialogOpen(open);
	};

	return {
		cancelOrderError,
		isCancelOrderDialogOpen,
		isCancelOrderPending: isCancellingOrder,
		handleOpenCancelOrder,
		handleConfirmCancelOrder,
		setIsCancelOrderDialogOpen: setIsCancelOrderDialogOpenWithReset,
	};
}
