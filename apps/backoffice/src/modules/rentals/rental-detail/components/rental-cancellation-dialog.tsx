import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";

export type RentalCancellationDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canCancel: boolean;
	isPending: boolean;
	onCancelRental: () => void;
};

export function RentalCancellationDialog({
	open,
	onOpenChange,
	canCancel,
	isPending,
	onCancelRental,
}: RentalCancellationDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Cancelar alquiler</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción marcará el alquiler como cancelado y liberará los
						bloqueos de activos para que vuelvan a estar disponibles.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Volver</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						disabled={!canCancel || isPending}
						onClick={onCancelRental}
					>
						{isPending ? "Cancelando..." : "Cancelar alquiler"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
