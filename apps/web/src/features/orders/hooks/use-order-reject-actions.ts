import { useState } from "react";
import { ProblemDetailsError } from "@/shared/errors";
import { useRejectOrder } from "../orders.mutations";

export function useOrderRejectActions(orderId: string) {
	const [isRejectOrderDialogOpen, setIsRejectOrderDialogOpen] = useState(false);
	const [rejectOrderError, setRejectOrderError] = useState<string | null>(null);
	const [rejectionReason, setRejectionReason] = useState("");
	const { mutateAsync: rejectOrder, isPending: isRejectingOrder } =
		useRejectOrder();

	const handleOpenRejectOrder = () => {
		setRejectOrderError(null);
		setIsRejectOrderDialogOpen(true);
	};

	const handleConfirmRejectOrder = async () => {
		setRejectOrderError(null);

		try {
			await rejectOrder({
				orderId,
				dto: {
					rejectionReason: rejectionReason.trim() || null,
				},
			});
			setIsRejectOrderDialogOpen(false);
			setRejectionReason("");
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				setRejectOrderError(
					error.problemDetails.detail ??
						error.problemDetails.title ??
						"No pudimos rechazar la solicitud.",
				);
				return;
			}

			setRejectOrderError("Ocurrio un error al rechazar la solicitud.");
		}
	};

	const setIsRejectOrderDialogOpenWithReset = (open: boolean) => {
		if (!open) {
			setRejectOrderError(null);
			setRejectionReason("");
		}

		setIsRejectOrderDialogOpen(open);
	};

	return {
		rejectOrderError,
		rejectionReason,
		isRejectOrderDialogOpen,
		isRejectOrderPending: isRejectingOrder,
		handleOpenRejectOrder,
		handleConfirmRejectOrder,
		setIsRejectOrderDialogOpen: setIsRejectOrderDialogOpenWithReset,
		setRejectionReason,
	};
}
