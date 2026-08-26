import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { QuantityStepper } from "../components/quantity-stepper";
import type { RentalDetailViewSelectionDto } from "../get-rental-detail-view/get-rental-detail-view.schema";
import { useChangeSelectionQuantityDialog } from "./use-change-selection-quantity-dialog";

interface ChangeSelectionQuantityDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selection: RentalDetailViewSelectionDto | null;
}

export function ChangeSelectionQuantityDialog({
	open,
	onOpenChange,
	selection,
}: ChangeSelectionQuantityDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Editar cantidad</DialogTitle>
					<DialogDescription>
						Cambiá la cantidad de este producto en el pedido confirmado.
					</DialogDescription>
				</DialogHeader>
				{open && selection ? (
					<ChangeSelectionQuantityDialogContent
						selection={selection}
						onClose={() => onOpenChange(false)}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function ChangeSelectionQuantityDialogContent({
	selection,
	onClose,
}: {
	selection: RentalDetailViewSelectionDto;
	onClose: () => void;
}) {
	const dialog = useChangeSelectionQuantityDialog({ selection, onClose });

	return (
		<div className="space-y-5">
			<div className="rounded-lg border bg-neutral-50 p-4">
				<p className="font-medium text-sm">{selection.rentableItemName}</p>
				<div className="mt-3 flex items-center justify-between gap-4">
					<div className="text-muted-foreground text-sm">
						<p>Actual: {dialog.currentQuantity}</p>
						<p>Nueva: {dialog.quantity}</p>
					</div>
					<QuantityStepper
						value={dialog.quantity}
						min={1}
						max={dialog.maximumQuantity}
						disabled={dialog.isSubmitting}
						onChange={dialog.onQuantityChange}
					/>
				</div>
			</div>

			{dialog.mode === "increase" ? (
				<div className="space-y-1 text-sm">
					<p>Unidades adicionales necesarias: {dialog.additionalQuantity}</p>
					{dialog.availabilityState === "checking" ? (
						<p className="text-muted-foreground">
							Consultando disponibilidad...
						</p>
					) : null}
					{dialog.availabilityState === "ready" ? (
						<p className="text-muted-foreground">
							Disponibles adicionales: {dialog.availableAdditionalUnits}
						</p>
					) : null}
					{dialog.availabilityState === "error" ? (
						<p className="text-amber-700">
							No pudimos verificar la disponibilidad. Podés intentar guardar; el
							pedido confirmará la capacidad final.
						</p>
					) : null}
				</div>
			) : null}

			{dialog.mode === "decrease" ? (
				<div className="space-y-4">
					<div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 text-sm">
						<AlertTriangle className="mt-0.5 size-4 shrink-0" />
						<p>
							Los equipos asignados que selecciones serán liberados del
							alquiler.
						</p>
					</div>
					{dialog.releaseRequirements?.map((requirement) => (
						<fieldset key={requirement.demandLineId} className="space-y-2">
							<legend className="font-medium text-sm">
								{requirement.equipmentTypeName}
							</legend>
							<p className="text-muted-foreground text-xs">
								Seleccioná {requirement.requiredCount} de{" "}
								{requirement.assignedAssets.length}
							</p>
							<div className="space-y-2 rounded-lg border p-3">
								{requirement.assignedAssets.map((assignment) => {
									const label =
										assignment.asset?.serialNumber?.trim() ||
										assignment.assetId;
									const checkboxId = `release-${requirement.demandLineId}-${assignment.assetId}`;
									return (
										<label
											key={assignment.assetId}
											htmlFor={checkboxId}
											className="flex items-center gap-2 text-sm"
										>
											<Checkbox
												id={checkboxId}
												disabled={dialog.isSubmitting}
												checked={dialog.selectedReleaseAssetIds.has(
													assignment.assetId,
												)}
												onCheckedChange={(checked) =>
													dialog.onReleaseAssetToggle(
														assignment.assetId,
														checked,
													)
												}
											/>
											<span>{label}</span>
										</label>
									);
								})}
							</div>
						</fieldset>
					))}
				</div>
			) : null}

			{dialog.submitErrorMessage ? (
				<p className="text-destructive text-sm">{dialog.submitErrorMessage}</p>
			) : null}

			<DialogFooter className="gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={onClose}
					disabled={dialog.isSubmitting}
				>
					Cancelar
				</Button>
				<Button
					type="button"
					onClick={dialog.onSubmit}
					disabled={dialog.isSubmitDisabled}
				>
					{dialog.isSubmitting ? (
						<Loader2 className="size-4 animate-spin" />
					) : null}
					Guardar cantidad
				</Button>
			</DialogFooter>
		</div>
	);
}
