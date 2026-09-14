import { RentalBudgetCustomerDialog } from "../documents/budget/rental-budget-customer-dialog";
import { RentalSigningInvitationDialog } from "../documents/signing/rental-signing-invitation-dialog";
import type { RentalDetailActions } from "../hooks/use-rental-detail-actions";
import { RescheduleRentalPeriodDialog } from "../reschedule-rental-period/reschedule-rental-period-dialog";
import { RentalActionsDropdown } from "./rental-actions-dropdown";
import { RentalCancellationDialog } from "./rental-cancellation-dialog";
import { RentalConfirmationDialog } from "./rental-confirmation-dialog";

export function RentalDetailActionsMenu({
	actions,
}: {
	actions: RentalDetailActions;
}) {
	return (
		<>
			<RentalActionsDropdown {...actions.dropdownProps} />
			<RescheduleRentalPeriodDialog {...actions.rescheduleDialogProps} />
			<RentalBudgetCustomerDialog {...actions.budgetCustomerDialogProps} />
			<RentalConfirmationDialog {...actions.confirmDialogProps} />
			<RentalCancellationDialog {...actions.cancelDialogProps} />
			<RentalSigningInvitationDialog {...actions.signingDialogProps} />
		</>
	);
}
