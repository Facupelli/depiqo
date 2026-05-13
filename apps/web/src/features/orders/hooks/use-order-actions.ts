import { useNavigate } from "@tanstack/react-router";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";
import { useOrderBudgetActions } from "./use-order-budget-actions";
import { useOrderCancelActions } from "./use-order-cancel-actions";
import { useOrderConfirmActions } from "./use-order-confirm-actions";
import { useOrderContractActions } from "./use-order-contract-actions";
import { useOrderDocumentState } from "./use-order-document-state";
import { useOrderLifecycleActions } from "./use-order-lifecycle-actions";
import { useOrderRejectActions } from "./use-order-reject-actions";
import { useOrderSigningActions } from "./use-order-signing-actions";

export function useOrderActions(order: ParsedOrderDetailResponseDto) {
	const navigate = useNavigate();
	const documentState = useOrderDocumentState();
	const contractActions = useOrderContractActions({
		orderId: order.id,
		isSigned: order.signing.status === "SIGNED",
		setContractError: documentState.setContractError,
		setContractBusinessErrorMessage:
			documentState.setContractBusinessErrorMessage,
		setIsContractBusinessErrorOpen:
			documentState.setIsContractBusinessErrorOpen,
	});
	const budgetActions = useOrderBudgetActions({
		order,
		setContractError: documentState.setContractError,
		setContractBusinessErrorMessage:
			documentState.setContractBusinessErrorMessage,
		setIsContractBusinessErrorOpen:
			documentState.setIsContractBusinessErrorOpen,
	});
	const confirmActions = useOrderConfirmActions(order);
	const cancelActions = useOrderCancelActions(order.id);
	const rejectActions = useOrderRejectActions(order.id);
	const lifecycleActions = useOrderLifecycleActions(order.id);
	const signingActions = useOrderSigningActions(order);

	const handleEditOrder = () => {
		navigate({
			to: "/dashboard/orders/$orderId/edit",
			params: { orderId: order.id },
		});
	};

	const handleReleaseEquipment = () => {
		// TODO: trigger release equipment mutation, then invalidate order query
	};

	const handleProcessPayment = () => {
		// TODO: trigger process payment mutation, then invalidate order query
	};

	return {
		documents: {
			contract: {
				isOpening: contractActions.isOpeningContract,
				open: contractActions.handleOpenContract,
			},
			error: {
				contractError: documentState.contractError,
				setContractError: documentState.setContractError,
				businessMessage: documentState.contractBusinessErrorMessage,
				setBusinessMessage: documentState.setContractBusinessErrorMessage,
				isBusinessErrorOpen: documentState.isContractBusinessErrorOpen,
				setIsBusinessErrorOpen: documentState.setIsContractBusinessErrorOpen,
			},
		},
		budget: {
			isOpening: budgetActions.isOpeningBudget,
			open: budgetActions.handleOpenBudget,
			customerDialog: {
				open: budgetActions.isBudgetCustomerDialogOpen,
				onOpenChange: budgetActions.handleBudgetCustomerDialogOpenChange,
				submit: budgetActions.handleSubmitBudgetCustomer,
			},
		},
		confirmation: {
			isDialogOpen: confirmActions.isConfirmOrderDialogOpen,
			setIsDialogOpen: confirmActions.setIsConfirmOrderDialogOpen,
			conflict: confirmActions.confirmOrderConflict,
			error: confirmActions.confirmOrderError,
			isPending: confirmActions.isConfirmOrderPending,
			openDialog: confirmActions.handleConfirmOrder,
			submit: confirmActions.handleConfirmOrderSubmission,
		},
		cancellation: {
			isDialogOpen: cancelActions.isCancelOrderDialogOpen,
			setIsDialogOpen: cancelActions.setIsCancelOrderDialogOpen,
			error: cancelActions.cancelOrderError,
			isPending: cancelActions.isCancelOrderPending,
			openDialog: cancelActions.handleOpenCancelOrder,
			submit: cancelActions.handleConfirmCancelOrder,
		},
		rejection: {
			isDialogOpen: rejectActions.isRejectOrderDialogOpen,
			setIsDialogOpen: rejectActions.setIsRejectOrderDialogOpen,
			error: rejectActions.rejectOrderError,
			isPending: rejectActions.isRejectOrderPending,
			reason: rejectActions.rejectionReason,
			openDialog: rejectActions.handleOpenRejectOrder,
			setReason: rejectActions.setRejectionReason,
			submit: rejectActions.handleConfirmRejectOrder,
		},
		lifecycle: {
			pendingAction: lifecycleActions.pendingLifecycleAction,
			isPending: lifecycleActions.isLifecycleActionPending,
			error: lifecycleActions.lifecycleActionError,
			setDialogOpen: lifecycleActions.setIsLifecycleActionDialogOpen,
			openPickup: lifecycleActions.handleMarkAsPickedUp,
			openReturn: lifecycleActions.handleMarkAsReturned,
			submit: lifecycleActions.handleConfirmLifecycleAction,
		},
		signing: {
			isInvitationDialogOpen: signingActions.isInvitationDialogOpen,
			setIsInvitationDialogOpen: signingActions.setIsInvitationDialogOpen,
			dialogIntent: signingActions.dialogIntent,
			submitError: signingActions.submitError,
			isPending: signingActions.isPending,
			openSendDialog: signingActions.openSendDialog,
			openResendDialog: signingActions.openResendDialog,
			submitInvitation: signingActions.submitInvitation,
		},
		edit: {
			open: handleEditOrder,
		},
		operations: {
			processPayment: handleProcessPayment,
			releaseEquipment: handleReleaseEquipment,
		},
	};
}
