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
import { QuantityStepper } from "../components/quantity-stepper";

interface RestorePackageDemandLineTarget {
	id: string;
	equipmentTypeName: string;
	restorableQuantity: number;
}

interface RestorePackageDemandLineAlertDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	target: RestorePackageDemandLineTarget | null;
	quantity: number;
	isPending: boolean;
	errorMessage: string | null;
	onQuantityChange: (quantity: number) => void;
	onConfirm: () => void;
}

export function RestorePackageDemandLineAlertDialog({
	open,
	onOpenChange,
	target,
	quantity,
	isPending,
	errorMessage,
	onQuantityChange,
	onConfirm,
}: RestorePackageDemandLineAlertDialogProps) {
	return (
		<AlertDialog open={open && target !== null} onOpenChange={onOpenChange}>
			<AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
				<AlertDialogHeader>
					<AlertDialogTitle>Restaurar equipo en el combo</AlertDialogTitle>
					<AlertDialogDescription>
						{target
							? `Elegí cuántas unidades de “${target.equipmentTypeName}” querés restaurar. Se asignarán automáticamente unidades compatibles disponibles para el resto del período. El precio del alquiler no cambiará.`
							: null}
					</AlertDialogDescription>
				</AlertDialogHeader>
				{target ? (
					<div className="flex items-center justify-between gap-4 rounded-lg border bg-neutral-50 p-3">
						<span className="font-medium text-sm">Cantidad a restaurar</span>
						<QuantityStepper
							value={quantity}
							min={1}
							max={target.restorableQuantity}
							disabled={isPending}
							onChange={onQuantityChange}
						/>
					</div>
				) : null}
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
