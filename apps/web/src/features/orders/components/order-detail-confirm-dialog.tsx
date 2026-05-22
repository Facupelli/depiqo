import { OrderStatus } from "@repo/types";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OrderAvailabilityConflictFeedback } from "@/features/orders/components/order-availability-conflict-feedback";
import {
	useOrderConfirmation,
	useOrderDetailContext,
} from "@/features/orders/contexts/order-detail.context";
import { buildOrderAvailabilityConflictDisplayModel, type OrderAvailabilityConflictDisplayModel } from "@/features/orders/order-availability-conflict.display-model";

export function OrderDetailConfirmDialog() {
	const { order } = useOrderDetailContext();
	const confirmation = useOrderConfirmation();
	const isDraft = order.status === OrderStatus.DRAFT;
	const isPendingReview = order.status === OrderStatus.PENDING_REVIEW;
	const hasCustomer = Boolean(order.customer);
	const conflictModel = confirmation.conflict
		? buildOrderAvailabilityConflictDisplayModel({
				order,
				conflict: confirmation.conflict,
			})
		: null;

	return (
		<AlertDialog
			open={confirmation.isDialogOpen}
			onOpenChange={confirmation.setIsDialogOpen}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{isPendingReview ? "Aprobar solicitud" : "Confirmar pedido"}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{isDraft
							? "Vas a confirmar este pedido con los precios ya guardados. La confirmación no recalcula importes."
							: isPendingReview
								? "Al aprobar esta solicitud vamos a volver a validar disponibilidad y recién en ese momento se van a reservar y asignar los equipos disponibles. Si la disponibilidad cambió, la aprobación puede fallar."
								: "Confirma este pedido para dejarlo listo para operación."}
					</AlertDialogDescription>
				</AlertDialogHeader>

				{isDraft && !hasCustomer ? (
					<p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
						Este borrador no tiene cliente vinculado. No puede confirmarse hasta
						completar ese paso fuera de esta pantalla.
					</p>
				) : null}

			<OrderConfirmationError error={confirmation.error} conflictModel={conflictModel} />

				<AlertDialogFooter>
					<AlertDialogCancel disabled={confirmation.isPending}>
						Cancelar
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={(event) => {
							event.preventDefault();
							void confirmation.submit();
						}}
						disabled={confirmation.isPending}
					>
						{confirmation.isPending
							? isPendingReview
								? "Aprobando solicitud..."
								: "Confirmando pedido..."
							: isPendingReview
								? "Aprobar solicitud"
								: "Confirmar pedido"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function OrderConfirmationError({ error, conflictModel }:{error:string|null, conflictModel: OrderAvailabilityConflictDisplayModel | null}) {
    if (conflictModel) {
        return <OrderAvailabilityConflictFeedback model={conflictModel} />;
    }
    if (error) {
        return <p className="text-sm text-destructive">{error}</p>;
    }
    return null;
}
