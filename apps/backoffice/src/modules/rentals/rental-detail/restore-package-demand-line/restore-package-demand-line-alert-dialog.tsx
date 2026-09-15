import type { GetRentalDetailRemovedDemandLineDto } from "@repo/api-contracts";
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
import { AlertCircle, Loader2 } from "lucide-react";

interface RestorePackageDemandLineAlertDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	demandLine: GetRentalDetailRemovedDemandLineDto | null;
	isPending: boolean;
	errorMessage: string | null;
	onConfirm: () => void;
}

export function RestorePackageDemandLineAlertDialog({
	open,
	onOpenChange,
	demandLine,
	isPending,
	errorMessage,
	onConfirm,
}: RestorePackageDemandLineAlertDialogProps) {
	return (
		<AlertDialog open={open && demandLine !== null} onOpenChange={onOpenChange}>
			<AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
				<AlertDialogHeader>
					<AlertDialogTitle>Restaurar equipo en el combo</AlertDialogTitle>
					<AlertDialogDescription>
						{demandLine
							? `¿Querés volver a incluir “${demandLine.equipmentTypeName} ×${demandLine.quantity}” en este combo? Se asignarán automáticamente unidades compatibles disponibles para el resto del período. El precio del alquiler no cambiará.`
							: null}
					</AlertDialogDescription>
				</AlertDialogHeader>
				{errorMessage ? (
					<div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900 text-sm">
						<AlertCircle className="mt-0.5 size-4 shrink-0" />
						<p className="min-w-0 [overflow-wrap:anywhere]">{errorMessage}</p>
					</div>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						disabled={isPending}
						onClick={(event) => {
							event.preventDefault();
							onConfirm();
						}}
					>
						{isPending ? <Loader2 className="size-4 animate-spin" /> : null}
						Restaurar equipo
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
