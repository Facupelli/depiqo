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
import type { RentalDetailViewDemandLineDto } from "../get-rental-detail-view/get-rental-detail-view.schema";

interface RemovePackageDemandLineAlertDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	demandLine: RentalDetailViewDemandLineDto | null;
	isPending: boolean;
	errorMessage: string | null;
	onConfirm: () => void;
}

export function RemovePackageDemandLineAlertDialog({
	open,
	onOpenChange,
	demandLine,
	isPending,
	errorMessage,
	onConfirm,
}: RemovePackageDemandLineAlertDialogProps) {
	return (
		<AlertDialog open={open && demandLine !== null} onOpenChange={onOpenChange}>
			<AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
				<AlertDialogHeader>
					<AlertDialogTitle>Quitar equipo del combo</AlertDialogTitle>
					<AlertDialogDescription>
						{demandLine
							? `¿Querés quitar “${demandLine.equipmentTypeName} ×${demandLine.quantity}” de este combo? El combo del catálogo no cambiará. El precio del alquiler tampoco cambiará y las unidades asignadas se liberarán.`
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
						variant="destructive"
						disabled={isPending}
						onClick={(event) => {
							event.preventDefault();
							onConfirm();
						}}
					>
						{isPending ? <Loader2 className="size-4 animate-spin" /> : null}
						Quitar equipo
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
