import type { OrderItemsUnavailableProblemDto } from "@repo/schemas";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useDraftOrderContext } from "@/features/orders/draft-order/draft-order.context";
import {
	buildCreateDraftOrderPayload,
	validateDraftOrderForSave,
} from "@/features/orders/draft-order/utils/draft-order-save";
import { parseOrderActionError } from "@/features/orders/order-action-errors";
import {
	useCreateDraftOrder,
	useEditOrder,
	useUpdateDraftOrder,
} from "@/features/orders/orders.mutations";
import type { OrderEditorMode } from "@/features/orders/order-editor/types/order-editor.types";
import { getOrderEditorCopy } from "@/features/orders/order-editor/utils/order-editor-copy";
import { useLocationId } from "@/shared/contexts/location/location.hooks";

export function useSaveOrderEditor(
	orderId?: string,
	mode: OrderEditorMode = "edit-draft",
) {
	const navigate = useNavigate();
	const locationId = useLocationId();
	const copy = getOrderEditorCopy(mode);
	const { state } = useDraftOrderContext();
	const { mutateAsync: createDraftOrder, isPending: isCreatePending } =
		useCreateDraftOrder();
	const { mutateAsync: updateDraftOrder, isPending: isUpdatePending } =
		useUpdateDraftOrder();
	const { mutateAsync: editOrder, isPending: isEditPending } = useEditOrder();
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saveConflict, setSaveConflict] =
		useState<OrderItemsUnavailableProblemDto | null>(null);

	async function handleSaveOrderEditor() {
		setSaveError(null);
		setSaveConflict(null);

		const validationError = validateDraftOrderForSave({
			state,
			locationId,
			mode,
		});

		if (validationError) {
			setSaveError(validationError);
			return;
		}

		if (!locationId) {
			setSaveError(copy.locationRequiredText);
			return;
		}

		const payload = buildCreateDraftOrderPayload({
			state,
			locationId,
		});

		try {
			if (orderId && mode === "edit-draft") {
				await updateDraftOrder({ orderId, data: payload });
				await navigate({
					to: "/dashboard/orders/$orderId",
					params: { orderId },
				});
			} else if (
				orderId &&
				(mode === "edit-pending-review" || mode === "edit-confirmed")
			) {
				await editOrder({ orderId, data: payload });
				await navigate({
					to: "/dashboard/orders/$orderId",
					params: { orderId },
				});
			} else {
				const newOrderId = await createDraftOrder(payload);
				await navigate({
					to: "/dashboard/orders/$orderId",
					params: { orderId: newOrderId },
				});
			}
		} catch (error) {
			const parsedError = parseOrderActionError(
				{ action: "save", mode },
				error,
			);
			setSaveConflict(parsedError.conflict);
			setSaveError(parsedError.message);
		}
	}

	return {
		handleSaveOrderEditor,
		saveConflict,
		saveError,
		isSaving: isCreatePending || isUpdatePending || isEditPending,
		hasBudget: state.budget !== null,
	};
}
