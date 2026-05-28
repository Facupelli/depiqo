import { useState } from "react";
import { ProblemDetailsError } from "@/shared/errors";
import {
	useMarkEquipmentAsRetired,
	useMarkEquipmentAsReturned,
} from "../orders.mutations";

type OrderLifecycleAction = "pickup" | "return" | null;

export function useOrderLifecycleActions(orderId: string) {
	const [pendingLifecycleAction, setPendingLifecycleAction] =
		useState<OrderLifecycleAction>(null);
	const [lifecycleActionError, setLifecycleActionError] = useState<
		string | null
	>(null);
	const {
		mutateAsync: markEquipmentAsRetired,
		isPending: isMarkingAsPickedUp,
	} = useMarkEquipmentAsRetired();
	const {
		mutateAsync: markEquipmentAsReturned,
		isPending: isMarkingAsReturned,
	} = useMarkEquipmentAsReturned();

	const handleMarkAsPickedUp = () => {
		setLifecycleActionError(null);
		setPendingLifecycleAction("pickup");
	};

	const handleMarkAsReturned = () => {
		setLifecycleActionError(null);
		setPendingLifecycleAction("return");
	};

	const handleConfirmLifecycleAction = async () => {
		if (!pendingLifecycleAction) {
			return;
		}

		setLifecycleActionError(null);

		try {
			if (pendingLifecycleAction === "pickup") {
				await markEquipmentAsRetired({ orderId });
			} else {
				await markEquipmentAsReturned({ orderId });
			}

			setPendingLifecycleAction(null);
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				setLifecycleActionError(
					error.problemDetails.detail ??
						error.problemDetails.title ??
						"No pudimos actualizar el estado del pedido.",
				);
				return;
			}

			setLifecycleActionError(
				"Ocurrio un error al actualizar el estado del pedido.",
			);
		}
	};

	const setIsLifecycleActionDialogOpen = (open: boolean) => {
		if (!open) {
			setLifecycleActionError(null);
			setPendingLifecycleAction(null);
		}
	};

	return {
		pendingLifecycleAction,
		lifecycleActionError,
		isLifecycleActionPending: isMarkingAsPickedUp || isMarkingAsReturned,
		handleMarkAsPickedUp,
		handleMarkAsReturned,
		handleConfirmLifecycleAction,
		setIsLifecycleActionDialogOpen,
	};
}
