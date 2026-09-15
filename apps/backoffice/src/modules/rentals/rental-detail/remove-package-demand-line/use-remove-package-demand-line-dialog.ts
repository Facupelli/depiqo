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
	const demandLine = demandLineId
		? (rental.selections
				.flatMap((selection) => selection.demandLines)
				.find((line) => line.id === demandLineId) ?? null)
		: null;

	function handleClose() {
		if (mutation.isPending) return;
		setErrorMessage(null);
		onClose();
	}

	async function handleSubmit() {
		if (!demandLine || mutation.isPending) return;
		setErrorMessage(null);

		try {
			await mutation.mutateAsync({
				rentalId: rental.id,
				demandLineId: demandLine.id,
				expectedVersion: rental.version,
			});
			toast.success("Equipo quitado del combo");
			handleClose();
		} catch (error) {
			const uiError = toRemovePackageDemandLineUiError(error);
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
		demandLine,
		errorMessage,
		isSubmitting: mutation.isPending,
		onTargetChange: () => setErrorMessage(null),
		onOpenChange: (open: boolean) => {
			if (!open) handleClose();
		},
		onSubmit: () => void handleSubmit(),
	};
}
