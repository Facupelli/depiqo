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
import { useOrderLifecycle } from "@/features/orders/contexts/order-detail.context";

export function OrderDetailLifecycleDialog() {
	const lifecycle = useOrderLifecycle();
	const action = lifecycle.pendingAction;

	if (!action) {
		return null;
	}

	const copy =
		action === "pickup"
			? {
					title: "Marcar equipo retirado",
					description:
						"Confirma que el cliente ya retiró el equipo en la sucursal. El pedido pasará a estar activo.",
					confirmLabel: lifecycle.isPending
						? "Marcando retiro..."
						: "Marcar retirado",
				}
			: {
					title: "Marcar equipo devuelto",
					description:
						"Confirma que el cliente ya devolvió el equipo. El pedido pasará a estar completado.",
					confirmLabel: lifecycle.isPending
						? "Marcando devolucion..."
						: "Marcar devuelto",
				};

	return (
		<AlertDialog open={Boolean(action)} onOpenChange={lifecycle.setDialogOpen}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{copy.title}</AlertDialogTitle>
					<AlertDialogDescription>{copy.description}</AlertDialogDescription>
				</AlertDialogHeader>

				{lifecycle.error ? (
					<p className="text-sm text-destructive">{lifecycle.error}</p>
				) : null}

				<AlertDialogFooter>
					<AlertDialogCancel disabled={lifecycle.isPending}>
						Cancelar
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={(event) => {
							event.preventDefault();
							void lifecycle.submit();
						}}
						disabled={lifecycle.isPending}
					>
						{copy.confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
