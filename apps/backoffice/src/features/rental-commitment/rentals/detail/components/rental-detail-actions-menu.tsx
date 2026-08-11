import { useRentalDetailActions } from "../hooks/use-rental-detail-actions";
import { RentalActionsDropdown } from "./rental-actions-dropdown";
import { RentalBudgetCustomerDialog } from "./rental-budget-customer-dialog";
import { RentalCancellationDialog } from "./rental-cancellation-dialog";
import { RentalConfirmationDialog } from "./rental-confirmation-dialog";
import { RentalSigningInvitationDialog } from "./rental-signing-invitation-dialog";

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
