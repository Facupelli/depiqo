import { useRentalDetailActions } from "../hooks/use-rental-detail-actions";
import { RentalActionsDropdown } from "./rental-actions-dropdown";
import { RentalCancellationDialog } from "./rental-cancellation-dialog";
import { RentalConfirmationDialog } from "./rental-confirmation-dialog";
import { RentalSigningInvitationDialog } from "./rental-signing-invitation-dialog";

export function RentalDetailActionsMenu() {
	const actions = useRentalDetailActions();

	return (
		<>
			<RentalActionsDropdown {...actions.dropdownProps} />
			<RentalConfirmationDialog {...actions.confirmDialogProps} />
			<RentalCancellationDialog {...actions.cancelDialogProps} />
			<RentalSigningInvitationDialog {...actions.signingDialogProps} />
		</>
	);
}
