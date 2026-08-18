import { RentalBudgetCustomerDialog } from "@/features/rental-commitment/rentals/detail/components/rental-budget-customer-dialog";
import { RentalSigningInvitationDialog } from "@/features/rental-commitment/rentals/detail/components/rental-signing-invitation-dialog";
import { useRentalDetailActions } from "../hooks/use-rental-detail-actions";
import { RentalActionsDropdown } from "./rental-actions-dropdown";
import { RentalCancellationDialog } from "./rental-cancellation-dialog";
import { RentalConfirmationDialog } from "./rental-confirmation-dialog";

export function RentalDetailActionsMenu() {
	const actions = useRentalDetailActions();

	return (
		<>
			<RentalActionsDropdown {...actions.dropdownProps} />
			<RentalBudgetCustomerDialog {...actions.budgetCustomerDialogProps} />
			<RentalConfirmationDialog {...actions.confirmDialogProps} />
			<RentalCancellationDialog {...actions.cancelDialogProps} />
			<RentalSigningInvitationDialog {...actions.signingDialogProps} />
		</>
	);
}
