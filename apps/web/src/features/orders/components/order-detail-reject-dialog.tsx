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
import { Textarea } from "@/components/ui/textarea";
import { useOrderRejection } from "@/features/orders/contexts/order-detail.context";

export function OrderDetailRejectDialog() {
	const rejection = useOrderRejection();

	return (
		<AlertDialog
			open={rejection.isDialogOpen}
			onOpenChange={rejection.setIsDialogOpen}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Rechazar solicitud</AlertDialogTitle>
					<AlertDialogDescription>
						Esta solicitud se cerrará sin reservar inventario. Puedes agregar un
						motivo opcional para el equipo o para compartir con el cliente más
						adelante.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="space-y-2">
					<label
						htmlFor="order-rejection-reason"
						className="text-sm font-medium"
					>
						Motivo de rechazo
						<span className="text-muted-foreground text-xs"> (opcional)</span>
					</label>
					<Textarea
						id="order-rejection-reason"
						value={rejection.reason}
						onChange={(event) => rejection.setReason(event.target.value)}
						placeholder="Escribe un motivo breve"
						className="min-h-24 resize-none"
						disabled={rejection.isPending}
					/>
				</div>

				{rejection.error ? (
					<p className="text-sm text-destructive">{rejection.error}</p>
				) : null}

				<AlertDialogFooter>
					<AlertDialogCancel disabled={rejection.isPending}>
						Volver
					</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={(event) => {
							event.preventDefault();
							void rejection.submit();
						}}
						disabled={rejection.isPending}
					>
						{rejection.isPending ? "Rechazando..." : "Rechazar solicitud"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
