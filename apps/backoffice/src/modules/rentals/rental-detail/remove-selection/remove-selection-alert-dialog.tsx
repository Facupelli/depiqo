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
import type { RentalDetailViewSelectionDto } from "../get-rental-detail-view/get-rental-detail-view.schema";
import type { RemoveSelectionAssetGroup } from "./use-remove-selection-dialog";

interface RemoveSelectionAlertDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selection: RentalDetailViewSelectionDto | null;
	assignedAssetGroups: RemoveSelectionAssetGroup[];
	isPending: boolean;
	errorMessage: string | null;
	onConfirm: () => void;
}

export function RemoveSelectionAlertDialog({
	open,
	onOpenChange,
	selection,
	assignedAssetGroups,
	isPending,
	errorMessage,
	onConfirm,
}: RemoveSelectionAlertDialogProps) {
	return (
		<AlertDialog open={open && selection !== null} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Eliminar producto del pedido</AlertDialogTitle>
					<AlertDialogDescription>
						Se eliminará este producto del pedido y se liberarán sus equipos
						asignados.
					</AlertDialogDescription>
				</AlertDialogHeader>

				{selection ? (
					<div className="space-y-4">
						<div className="rounded-lg border bg-neutral-50 px-4 py-3">
							<p className="text-muted-foreground text-xs">Producto</p>
							<p className="font-medium text-sm">
								{selection.rentableItemName}
							</p>
						</div>

						{assignedAssetGroups.length > 0 ? (
							<div className="space-y-3">
								<p className="font-medium text-sm">
									Equipos asignados que se liberarán
								</p>
								{assignedAssetGroups.map((group) => (
									<div key={group.demandLineId} className="space-y-1.5">
										<p className="text-muted-foreground text-xs">
											{group.equipmentTypeName}
										</p>
										<ul className="space-y-1 rounded-lg border px-3 py-2 font-mono text-xs">
											{group.assets.map((asset) => (
												<li key={asset.assetId}>{asset.label}</li>
											))}
										</ul>
									</div>
								))}
							</div>
						) : null}
					</div>
				) : null}

				{errorMessage ? (
					<div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900 text-sm">
						<AlertCircle className="mt-0.5 size-4 shrink-0" />
						<p>{errorMessage}</p>
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
						Eliminar producto
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
