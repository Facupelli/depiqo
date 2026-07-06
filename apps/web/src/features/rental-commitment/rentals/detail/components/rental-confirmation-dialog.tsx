import { AlertCircle } from "lucide-react";
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

export type RentalConfirmationDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canConfirm: boolean;
	isPending: boolean;
	errorMessage: string | null;
	onConfirm: () => void;
};

export function RentalConfirmationDialog({
	open,
	onOpenChange,
	canConfirm,
	isPending,
	errorMessage,
	onConfirm,
}: RentalConfirmationDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar alquiler</AlertDialogTitle>
					<AlertDialogDescription>
						Al confirmar este alquiler, los equipos quedarán bloqueados durante
						el período del alquiler y no estarán disponibles para otros pedidos.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{errorMessage ? (
					<div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
						<AlertCircle className="mt-0.5 size-4 shrink-0" />
						<p>{errorMessage}</p>
					</div>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Volver</AlertDialogCancel>
					<AlertDialogAction
						disabled={!canConfirm || isPending}
						onClick={(event) => {
							event.preventDefault();
							onConfirm();
						}}
					>
						{isPending ? "Confirmando..." : "Confirmar alquiler"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
