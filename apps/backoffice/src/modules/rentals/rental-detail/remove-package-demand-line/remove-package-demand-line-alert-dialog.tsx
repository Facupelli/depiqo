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
import { Checkbox } from "@repo/ui/components/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";
import type { RentalDetailViewDemandLineDto } from "../get-rental-detail-view/get-rental-detail-view.schema";

interface RemovePackageDemandLineAlertDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	demandLine: RentalDetailViewDemandLineDto | null;
	selectedReleaseAssetIds: Set<string>;
	isPending: boolean;
	isSubmitDisabled: boolean;
	errorMessage: string | null;
	onReleaseAssetToggle: (assetId: string, checked: boolean) => void;
	onConfirm: () => void;
}

export function RemovePackageDemandLineAlertDialog({
	open,
	onOpenChange,
	demandLine,
	selectedReleaseAssetIds,
	isPending,
	isSubmitDisabled,
	errorMessage,
	onReleaseAssetToggle,
	onConfirm,
}: RemovePackageDemandLineAlertDialogProps) {
	return (
		<AlertDialog open={open && demandLine !== null} onOpenChange={onOpenChange}>
			<AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
				<AlertDialogHeader>
					<AlertDialogTitle>Quitar equipo del combo</AlertDialogTitle>
					<AlertDialogDescription>
						{demandLine
							? `Elegí las unidades de “${demandLine.equipmentTypeName}” que querés quitar. El combo del catálogo y el precio aceptado del alquiler no cambiarán. Las unidades seleccionadas se liberarán.`
							: null}
					</AlertDialogDescription>
				</AlertDialogHeader>
				{demandLine ? (
					<div className="space-y-4">
						<fieldset className="min-w-0 space-y-2">
							<legend className="font-medium text-sm">
								Unidades a liberar
							</legend>
							<p className="text-muted-foreground text-xs">
								{selectedReleaseAssetIds.size} de{" "}
								{demandLine.assignedAssets.length}{" "}
								{selectedReleaseAssetIds.size === 1
									? "seleccionada"
									: "seleccionadas"}
							</p>
							<div className="space-y-2 rounded-lg border p-3">
								{demandLine.assignedAssets.map((assignment, index) => {
									const serialNumber = assignment.asset?.serialNumber?.trim();
									const ownerName = assignment.asset?.owner?.name.trim();
									const fallbackLabel = `Unidad ${index + 1}`;
									const label =
										serialNumber ||
										(ownerName
											? `${fallbackLabel} · ${ownerName}`
											: fallbackLabel);
									const checkboxId = `remove-package-${demandLine.id}-${assignment.assetId}`;
									return (
										<label
											key={assignment.assetId}
											htmlFor={checkboxId}
											className="flex min-w-0 items-start gap-2 text-sm"
										>
											<Checkbox
												id={checkboxId}
												disabled={isPending}
												checked={selectedReleaseAssetIds.has(
													assignment.assetId,
												)}
												onCheckedChange={(checked) =>
													onReleaseAssetToggle(assignment.assetId, checked)
												}
											/>
											<span className="min-w-0 [overflow-wrap:anywhere]">
												{label}
											</span>
										</label>
									);
								})}
							</div>
						</fieldset>
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
						variant="destructive"
						disabled={isSubmitDisabled}
						onClick={(event) => {
							event.preventDefault();
							onConfirm();
						}}
					>
						{isPending ? <Loader2 className="size-4 animate-spin" /> : null}
						{selectedReleaseAssetIds.size > 1
							? `Quitar ${selectedReleaseAssetIds.size} unidades`
							: "Quitar equipo"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
