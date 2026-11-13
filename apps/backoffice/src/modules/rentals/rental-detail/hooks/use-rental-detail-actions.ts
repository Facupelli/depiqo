import { TenantPermission } from "@repo/api-contracts";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { can } from "@/auth/permissions";
import { useBranchTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { getDeliveryErrorMessage } from "../../shared/delivery-error-messages";
import { useCancelRental } from "../cancel-rental/cancel-rental.mutation";
import { useConfirmRental } from "../confirm-rental/confirm-rental.mutation";
import {
	type RentalBudgetCustomerFormValues,
	toGenerateRentalBudgetDto,
} from "../documents/budget/rental-budget-customer.schema";
import { useRentalBudgetActions } from "../documents/budget/use-rental-budget-actions";
import { useRentalRemitoActions } from "../documents/remito/use-rental-remito-actions";
import { useRentalSigningInvitationActions } from "../documents/signing/use-rental-signing-invitation-actions";
import { useRentalDetailContext } from "../rental-detail.context";

const CONFIRM_RENTAL_FALLBACK_ERROR =
	"No pudimos confirmar el alquiler. Revisá el cliente, los importes, las condiciones de envío y la disponibilidad de equipos.";

export function useRentalDetailActions() {
	const navigate = useNavigate();
	const { rental, customerSummary, permissions } = useRentalDetailContext();
	const canManageConfirmed = can(
		permissions,
		TenantPermission.RentalsConfirmedManage,
	);
	const operationalTimezone = useBranchTimezone(rental.branchId);
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
	const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);

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
	const confirmationVersionConflict =
		confirmRental.error?.problemDetails.code ===
		"rental_commitment.rental_version_conflict";
	const rejectedReview =
		confirmationVersionConflict &&
		confirmRental.variables?.expectedVersion === rental.version;
	const canConfirmRental =
		isDraftRental && hasConfirmPrerequisites && !rejectedReview;
	const canCancelRental = !["CANCELLED", "COMPLETED"].includes(rental.status);
	const canRescheduleRental =
		rental.status === "CONFIRMED" &&
		new Date(rental.period.start).getTime() > Date.now();
	const confirmRentalErrorMessage = confirmationVersionConflict
		? "El alquiler cambió. Actualizá la información y revisala antes de confirmar nuevamente."
		: confirmRental.error
			? (getDeliveryErrorMessage(confirmRental.error) ??
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
			canConfirmRental,
			isConfirming: confirmRental.isPending,
			canSendSigningInvitation,
			isSendingSigningInvitation: signing.isPending,
			canCancelRental,
			isCancelling: cancelRental.isPending,
			isOpeningRemito: remito.isOpening,
			isOpeningBudget: budget.isOpening,
			onEditDraft: () =>
				navigate({
					to: "/dashboard/orders/$orderId/edit",
					params: { orderId: rental.id },
				}),
			onOpenConfirmDialog: () => setConfirmDialogOpen(true),
			onOpenRemito: remito.openRemito,
			onOpenBudget: budget.openBudget,
			onOpenSigningDialog: signing.openSendDialog,
			onOpenCancelDialog: () => setIsCancelDialogOpen(true),
		},
		periodEditAction:
			canManageConfirmed && canRescheduleRental
				? { onOpen: () => setIsRescheduleDialogOpen(true) }
				: undefined,
		rescheduleDialogProps: {
			rentalId: rental.id,
			rentalVersion: rental.version,
			fulfillmentMethod: rental.fulfillment.method,
			deliveryArrangement: rental.acceptedDelivery?.arrangement ?? null,
			reservationAssetLabels: Object.fromEntries(
				[
					...rental.selections.flatMap((selection) => selection.demandLines),
					...rental.accessories,
				].flatMap((line) =>
					line.assignedAssets.map((asset) => [
						asset.assetId,
						`${line.equipmentTypeName} · ${asset.assetId}`,
					]),
				),
			),
			canAuthorizeDeliveryException: can(
				permissions,
				TenantPermission.RentalsDeliveryManage,
			),
			currentPeriodStart: rental.period.start,
			currentPeriodEnd: rental.period.end,
			operationalTimezone,
			open: isRescheduleDialogOpen,
			onOpenChange: setIsRescheduleDialogOpen,
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
			onConfirm: (expectedVersion: number) =>
				confirmRental.mutate({ rentalId: rental.id, expectedVersion }),
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
			submitError: signing.submitError,
			isPending: signing.isPending,
			onSubmit: signing.submitInvitation,
		},
	};
}

export type RentalDetailActions = ReturnType<typeof useRentalDetailActions>;
