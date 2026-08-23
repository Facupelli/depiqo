import type { GetEquipmentTypeDetailResponseDto } from "@repo/api-contracts";
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
import { AlertCircle } from "lucide-react";

interface RetireAssetAlertDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	unit: GetEquipmentTypeDetailResponseDto["assets"][number];
	isPending: boolean;
	errorMessage: string | null;
	onConfirm: () => void;
}

export function RetireAssetAlertDialog({
	open,
	onOpenChange,
	unit,
	isPending,
	errorMessage,
	onConfirm,
}: RetireAssetAlertDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Marcar como retirado</AlertDialogTitle>
					<AlertDialogDescription>
						La unidad{" "}
						<span className="font-medium text-neutral-950">
							{unit.serialNumber ?? unit.id}
						</span>{" "}
						quedará marcada como retirada de forma permanente y ya no estará
						disponible para futuras asignaciones de alquiler. Esta acción no
						puede deshacerse.
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
						variant="destructive"
						disabled={isPending}
						onClick={(event) => {
							event.preventDefault();
							onConfirm();
						}}
					>
						{isPending ? "Marcando..." : "Marcar como retirado"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
