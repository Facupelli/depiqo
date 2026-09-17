import { TenantPermission } from "@repo/api-contracts";
import { can } from "@/auth/permissions";
import { RentalBudgetCustomerDialog } from "../documents/budget/rental-budget-customer-dialog";
import { RentalSigningInvitationDialog } from "../documents/signing/rental-signing-invitation-dialog";
import type { RentalDetailActions } from "../hooks/use-rental-detail-actions";
import { useRentalDetailContext } from "../rental-detail.context";
import { RescheduleRentalPeriodDialog } from "../reschedule-rental-period/reschedule-rental-period-dialog";
import {
	BudgetAction,
	CancelRentalAction,
	ConfirmRentalAction,
	EditDraftAction,
	RemitoAction,
	RentalActionsDropdown,
	SigningInvitationAction,
} from "./rental-actions-dropdown";
import { RentalCancellationDialog } from "./rental-cancellation-dialog";
import { RentalConfirmationDialog } from "./rental-confirmation-dialog";

export function RentalDetailActionsMenu({
	actions,
}: {
	actions: RentalDetailActions;
}) {
	const { rental, permissions } = useRentalDetailContext();
	const isDraftRental = rental.status === "DRAFT";
	const canManageProposals = can(
		permissions,
		TenantPermission.RentalsProposalsManage,
	);
	const canConfirm = can(permissions, TenantPermission.RentalsConfirm);
	const canCancel = can(permissions, TenantPermission.RentalsCancel);
	const canGenerateContracts = can(
		permissions,
		TenantPermission.ContractsGenerate,
	);
	const canSendSigning = can(
		permissions,
		TenantPermission.ContractsSigningSend,
	);
	const dropdown = actions.dropdownProps;

	return (
		<>
			<RentalActionsDropdown>
				{isDraftRental && canManageProposals ? (
					<EditDraftAction onSelect={dropdown.onEditDraft} />
				) : null}
				{isDraftRental && canConfirm ? (
					<ConfirmRentalAction
						disabled={!dropdown.canConfirmRental}
						isPending={dropdown.isConfirming}
						onSelect={dropdown.onOpenConfirmDialog}
					/>
				) : null}
				{isDraftRental && canGenerateContracts ? (
					<BudgetAction
						isPending={dropdown.isOpeningBudget}
						onSelect={dropdown.onOpenBudget}
					/>
				) : null}
				{!isDraftRental && canGenerateContracts ? (
					<RemitoAction
						isPending={dropdown.isOpeningRemito}
						onSelect={dropdown.onOpenRemito}
					/>
				) : null}
				{!isDraftRental && canSendSigning ? (
					<SigningInvitationAction
						disabled={!dropdown.canSendSigningInvitation}
						isPending={dropdown.isSendingSigningInvitation}
						onSelect={dropdown.onOpenSigningDialog}
					/>
				) : null}
				{canCancel ? (
					<CancelRentalAction
						disabled={!dropdown.canCancelRental}
						isPending={dropdown.isCancelling}
						onSelect={dropdown.onOpenCancelDialog}
					/>
				) : null}
			</RentalActionsDropdown>
			<RescheduleRentalPeriodDialog {...actions.rescheduleDialogProps} />
			<RentalBudgetCustomerDialog {...actions.budgetCustomerDialogProps} />
			<RentalConfirmationDialog {...actions.confirmDialogProps} />
			<RentalCancellationDialog {...actions.cancelDialogProps} />
			<RentalSigningInvitationDialog {...actions.signingDialogProps} />
		</>
	);
}
