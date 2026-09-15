import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useRentalDetailContext } from "../rental-detail.context";
import { rentalDetailViewQueries } from "../rental-detail.queries";
import { toRemovePackageDemandLineUiError } from "./remove-package-demand-line.errors";
import { useRemovePackageDemandLine } from "./remove-package-demand-line.mutation";

interface UseRemovePackageDemandLineDialogInput {
	demandLineId: string | null;
	onClose: () => void;
}

export function useRemovePackageDemandLineDialog({
	demandLineId,
	onClose,
}: UseRemovePackageDemandLineDialogInput) {
	const { rental } = useRentalDetailContext();
	const queryClient = useQueryClient();
	const mutation = useRemovePackageDemandLine();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [selectedReleaseAssetIds, setSelectedReleaseAssetIds] = useState<
		Set<string>
	>(() => new Set());
	const demandLine = demandLineId
		? (rental.selections
				.flatMap((selection) => selection.demandLines)
				.find((line) => line.id === demandLineId) ?? null)
		: null;

	function resetState() {
		setErrorMessage(null);
		setSelectedReleaseAssetIds(new Set());
	}

	function handleClose() {
		if (mutation.isPending) return;
		resetState();
		onClose();
	}

	function handleReleaseAssetToggle(assetId: string, checked: boolean) {
		if (mutation.isPending) return;
		setErrorMessage(null);
		setSelectedReleaseAssetIds((current) => {
			const next = new Set(current);
			if (checked) {
				next.add(assetId);
			} else {
				next.delete(assetId);
			}
			return next;
		});
	}

	async function handleSubmit() {
		if (!demandLine || mutation.isPending || selectedReleaseAssetIds.size === 0)
			return;
		setErrorMessage(null);

		try {
			await mutation.mutateAsync({
				rentalId: rental.id,
				demandLineId: demandLine.id,
				expectedVersion: rental.version,
				quantity: selectedReleaseAssetIds.size,
				releaseAssetIds: [...selectedReleaseAssetIds],
			});
			toast.success("Equipo quitado del combo");
			resetState();
			onClose();
		} catch (error) {
			const uiError = toRemovePackageDemandLineUiError(error);
			setErrorMessage(uiError.message);
			if (uiError.shouldRefreshDetail) {
				toast.error(uiError.message);
				try {
					await queryClient.fetchQuery(
						rentalDetailViewQueries.detail(rental.id),
					);
					resetState();
					onClose();
				} catch {
					setErrorMessage(
						`${uiError.message} No pudimos actualizar el alquiler. Revisá tu conexión e intentá actualizar la página.`,
					);
				}
			}
		}
	}

	return {
		demandLine,
		selectedReleaseAssetIds,
		errorMessage,
		isSubmitting: mutation.isPending,
		isSubmitDisabled: mutation.isPending || selectedReleaseAssetIds.size === 0,
		onReleaseAssetToggle: handleReleaseAssetToggle,
		onTargetChange: resetState,
		onOpenChange: (open: boolean) => {
			if (!open) handleClose();
		},
		onSubmit: () => void handleSubmit(),
	};
}
