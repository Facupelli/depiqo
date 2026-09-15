import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useRentalDetailContext } from "../rental-detail.context";
import { rentalDetailViewQueries } from "../rental-detail.queries";
import { toRestorePackageDemandLineUiError } from "./restore-package-demand-line.errors";
import { useRestorePackageDemandLine } from "./restore-package-demand-line.mutation";

interface UseRestorePackageDemandLineDialogInput {
	demandLineId: string | null;
	onClose: () => void;
}

export function useRestorePackageDemandLineDialog({
	demandLineId,
	onClose,
}: UseRestorePackageDemandLineDialogInput) {
	const { rental } = useRentalDetailContext();
	const queryClient = useQueryClient();
	const mutation = useRestorePackageDemandLine();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [quantity, setQuantity] = useState(1);
	const target = demandLineId
		? (rental.selections
				.flatMap((selection) => [
					...selection.removedDemandLines.map((line) => ({
						id: line.id,
						equipmentTypeName: line.equipmentTypeName,
						restorableQuantity: line.quantity,
					})),
					...selection.demandLines
						.filter((line) => line.removedQuantity > 0)
						.map((line) => ({
							id: line.id,
							equipmentTypeName: line.equipmentTypeName,
							restorableQuantity: line.removedQuantity,
						})),
				])
				.find((line) => line.id === demandLineId) ?? null)
		: null;

	function resetState() {
		setErrorMessage(null);
		setQuantity(1);
	}

	function handleClose() {
		if (mutation.isPending) return;
		resetState();
		onClose();
	}

	function handleQuantityChange(nextQuantity: number) {
		if (!target || mutation.isPending) return;
		setQuantity(
			Math.min(
				target.restorableQuantity,
				Math.max(1, Math.trunc(nextQuantity)),
			),
		);
		setErrorMessage(null);
	}

	async function handleSubmit() {
		if (!target || mutation.isPending) return;
		setErrorMessage(null);

		try {
			await mutation.mutateAsync({
				rentalId: rental.id,
				demandLineId: target.id,
				expectedVersion: rental.version,
				quantity,
			});
			toast.success("Equipo restaurado en el combo");
			handleClose();
		} catch (error) {
			const uiError = toRestorePackageDemandLineUiError(error);
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
						`${uiError.message} No pudimos actualizar el alquiler. Revisá tu conexión e intentá actualizar la página.`,
					);
				}
			}
		}
	}

	return {
		target,
		quantity,
		errorMessage,
		isSubmitting: mutation.isPending,
		onQuantityChange: handleQuantityChange,
		onTargetChange: resetState,
		onOpenChange: (open: boolean) => {
			if (!open) handleClose();
		},
		onSubmit: () => void handleSubmit(),
	};
}
