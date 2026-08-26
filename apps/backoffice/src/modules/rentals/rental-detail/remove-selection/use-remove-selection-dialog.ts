import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useRentalDetailContext } from "../rental-detail.context";
import { rentalDetailViewQueries } from "../rental-detail.queries";
import { toRemoveSelectionUiError } from "./remove-selection.errors";
import { useRemoveSelection } from "./remove-selection.mutation";

interface UseRemoveSelectionDialogInput {
	selectionId: string | null;
	onClose: () => void;
}

export interface RemoveSelectionAssetGroup {
	demandLineId: string;
	equipmentTypeName: string;
	assets: Array<{ assetId: string; label: string }>;
}

export function useRemoveSelectionDialog({
	selectionId,
	onClose,
}: UseRemoveSelectionDialogInput) {
	const { rental } = useRentalDetailContext();
	const queryClient = useQueryClient();
	const mutation = useRemoveSelection();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const selection = selectionId
		? (rental.selections.find((item) => item.id === selectionId) ?? null)
		: null;
	const assignedAssetGroups: RemoveSelectionAssetGroup[] =
		selection?.demandLines.flatMap((demandLine) => {
			if (demandLine.assignedAssets.length === 0) return [];
			return [
				{
					demandLineId: demandLine.id,
					equipmentTypeName: demandLine.equipmentTypeName,
					assets: demandLine.assignedAssets.map((assignment) => ({
						assetId: assignment.assetId,
						label: assignment.asset?.serialNumber?.trim() || assignment.assetId,
					})),
				},
			];
		}) ?? [];

	function handleClose() {
		if (mutation.isPending) return;
		setErrorMessage(null);
		onClose();
	}

	async function handleSubmit() {
		if (!selection || mutation.isPending) return;
		setErrorMessage(null);

		try {
			await mutation.mutateAsync({
				rentalId: rental.id,
				selectionId: selection.id,
				expectedVersion: rental.version,
			});
			toast.success("Producto eliminado del pedido");
			handleClose();
		} catch (error) {
			const uiError = toRemoveSelectionUiError(error);
			setErrorMessage(uiError.message);

			if (uiError.shouldRefreshDetail) {
				toast.error(uiError.message);
				try {
					await queryClient.fetchQuery(
						rentalDetailViewQueries.detail(rental.id),
					);
					handleClose();
				} catch {
					setErrorMessage(
						`${uiError.message} No pudimos actualizar el pedido. Revisá tu conexión e intentá actualizar la página.`,
					);
				}
			}
		}
	}

	return {
		selection,
		assignedAssetGroups,
		errorMessage,
		isSubmitting: mutation.isPending,
		onTargetChange: () => setErrorMessage(null),
		onOpenChange: (open: boolean) => {
			if (!open) handleClose();
		},
		onSubmit: () => void handleSubmit(),
	};
}
