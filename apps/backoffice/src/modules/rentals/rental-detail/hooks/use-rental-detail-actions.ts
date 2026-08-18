import { useState } from "react";
import { useRentalBudgetActions } from "@/features/rental-commitment/rentals/detail/hooks/use-rental-budget-actions";
import { useRentalRemitoActions } from "@/features/rental-commitment/rentals/detail/hooks/use-rental-remito-actions";
import { useRentalSigningInvitationActions } from "@/features/rental-commitment/rentals/detail/hooks/use-rental-signing-invitation-actions";
import {
	type RentalBudgetCustomerFormValues,
	toGenerateRentalBudgetDto,
} from "@/features/rental-commitment/rentals/detail/rental-budget-customer.schema";
import { useCancelRental } from "../cancel-rental/cancel-rental.mutation";
import { useConfirmRental } from "../confirm-rental/confirm-rental.mutation";
import { useRentalDetailContext } from "../rental-detail.context";

const CONFIRM_RENTAL_FALLBACK_ERROR =
	"No pudimos confirmar el alquiler. Revisá que tenga cliente, precio calculado y equipos disponibles para el período.";

export function useRentalDetailActions() {
	const { rental, customerSummary } = useRentalDetailContext();
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

	const budget = useRentalBudgetActions(rental.id, rental.customerId !== null);
	const remito = useRentalRemitoActions(rental.id);
	const signing = useRentalSigningInvitationActions(rental);
	const confirmRental = useConfirmRental({
		onSuccess: () => setIsConfirmDialogOpen(false),
	});
	const cancelRental = useCancelRental({
		onSuccess: () => setIsCancelDialogOpen(false),
	});

	const isDraftRental = rental.status === "DRAFT";
	const canSendSigningInvitation = customerSummary !== null;
	const hasConfirmPrerequisites =
		customerSummary !== null && rental.pricing !== null;
	const canConfirmRental = isDraftRental && hasConfirmPrerequisites;
	const canCancelRental = !["CANCELLED", "COMPLETED"].includes(rental.status);
	const confirmRentalErrorMessage = confirmRental.error
		? (confirmRental.error.problemDetails.detail ??
			confirmRental.error.problemDetails.title ??
			CONFIRM_RENTAL_FALLBACK_ERROR)
		: null;

	async function submitRentalBudgetCustomer(
		values: RentalBudgetCustomerFormValues,
	) {
		await budget.submitCustomerDetails(toGenerateRentalBudgetDto(values));
	}

	function setConfirmDialogOpen(open: boolean) {
		setIsConfirmDialogOpen(open);

		if (!open) {
			confirmRental.reset();
		}
	}

	return {
		dropdownProps: {
			isDraftRental,
			canConfirmRental,
			isConfirming: confirmRental.isPending,
			canSendSigningInvitation,
			isSendingSigningInvitation: signing.isPending,
			canCancelRental,
			isCancelling: cancelRental.isPending,
			isOpeningRemito: remito.isOpening,
			isOpeningBudget: budget.isOpening,
			onOpenConfirmDialog: () => setConfirmDialogOpen(true),
			onOpenRemito: remito.openRemito,
			onOpenBudget: budget.openBudget,
			onOpenSigningDialog: signing.openSendDialog,
			onOpenCancelDialog: () => setIsCancelDialogOpen(true),
		},
		budgetCustomerDialogProps: {
			open: budget.isCustomerDialogOpen,
			onOpenChange: budget.setIsCustomerDialogOpen,
			isPending: budget.isOpening,
			onSubmit: submitRentalBudgetCustomer,
		},
		confirmDialogProps: {
			open: isConfirmDialogOpen,
			onOpenChange: setConfirmDialogOpen,
			canConfirm: canConfirmRental,
			isPending: confirmRental.isPending,
			errorMessage: confirmRentalErrorMessage,
			onConfirm: () => confirmRental.mutate({ rentalId: rental.id }),
		},
		cancelDialogProps: {
			open: isCancelDialogOpen,
			onOpenChange: setIsCancelDialogOpen,
			canCancel: canCancelRental,
			isPending: cancelRental.isPending,
			onCancelRental: () => cancelRental.mutate({ rentalId: rental.id }),
		},
		signingDialogProps: {
			open: signing.isInvitationDialogOpen,
			onOpenChange: signing.setIsInvitationDialogOpen,
			defaultEmail: customerSummary?.email,
			dialogIntent: signing.dialogIntent,
			submitError: signing.submitError,
			isPending: signing.isPending,
			onSubmit: signing.submitInvitation,
		},
	};
}
