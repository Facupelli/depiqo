import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { Loader2 } from "lucide-react";
import { useId } from "react";
import { formatMoney } from "@/shared/utils/formatters";
import { useEditPriceAdjustmentDialog } from "./use-edit-price-adjustment-dialog";

interface EditPriceAdjustmentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function EditPriceAdjustmentDialog({
	open,
	onOpenChange,
}: EditPriceAdjustmentDialogProps) {
	if (!open) return null;

	return <OpenEditPriceAdjustmentDialog onOpenChange={onOpenChange} />;
}

function OpenEditPriceAdjustmentDialog({
	onOpenChange,
}: {
	onOpenChange: (open: boolean) => void;
}) {
	const dialog = useEditPriceAdjustmentDialog({
		onClose: () => onOpenChange(false),
	});

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen && dialog.isPending) return;
		onOpenChange(nextOpen);
	}

	return (
		<Dialog
			open
			onOpenChange={handleOpenChange}
			disablePointerDismissal={dialog.isPending}
		>
			<DialogContent
				className="sm:max-w-md"
				showCloseButton={!dialog.isPending}
			>
				<DialogHeader>
					<DialogTitle>Ajustar precio</DialogTitle>
					<DialogDescription>
						Definí el total acordado para este pedido confirmado.
					</DialogDescription>
				</DialogHeader>
				<EditPriceAdjustmentDialogContent
					dialog={dialog}
					onClose={() => handleOpenChange(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}

type EditPriceAdjustmentDialogController = ReturnType<
	typeof useEditPriceAdjustmentDialog
>;

function EditPriceAdjustmentDialogContent({
	dialog,
	onClose,
}: {
	dialog: EditPriceAdjustmentDialogController;
	onClose: () => void;
}) {
	const targetTotalId = useId();
	const reasonId = useId();
	const difference = dialog.difference;
	const differenceSign = difference?.startsWith("-")
		? "-"
		: difference && difference !== "0"
			? "+"
			: "";
	const formattedDifference = difference
		? `${differenceSign}${formatMoney(difference.replace(/^[+-]/, ""), dialog.currency)}`
		: "-";

	return (
		<div className="space-y-5">
			<div className="grid grid-cols-2 items-baseline gap-4 rounded-lg border bg-neutral-50 p-4">
				<span className="text-sm text-muted-foreground">
					Precio antes del ajuste
				</span>
				<span className="text-right font-mono font-semibold text-sm">
					{formatMoney(dialog.acceptedCalculatedTotal, dialog.currency)}
				</span>
			</div>

			<Field>
				<FieldLabel htmlFor={targetTotalId}>Total acordado</FieldLabel>
				<Input
					id={targetTotalId}
					inputMode="decimal"
					placeholder="Ingresá un total"
					value={dialog.targetTotal}
					disabled={dialog.isPending}
					onChange={(event) => dialog.onTargetTotalChange(event.target.value)}
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor={reasonId}>Motivo</FieldLabel>
				<Textarea
					id={reasonId}
					placeholder="Opcional"
					value={dialog.reason}
					disabled={dialog.isPending}
					onChange={(event) => dialog.onReasonChange(event.target.value)}
					className="min-h-20"
				/>
			</Field>

			<div className="flex items-baseline justify-between gap-4 border-t border-dashed pt-3">
				<span className="text-sm text-muted-foreground">Ajuste resultante</span>
				<span className="font-mono font-semibold text-sm">
					{formattedDifference}
				</span>
			</div>

			{dialog.reconciliationMessage ? (
				<p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900 text-sm">
					{dialog.reconciliationMessage}
				</p>
			) : null}
			{dialog.errorMessage ? (
				<p className="text-destructive text-sm">{dialog.errorMessage}</p>
			) : null}

			<DialogFooter className="gap-2 sm:justify-between">
				<div>
					{dialog.hasAdjustment ? (
						<Button
							type="button"
							variant="destructive"
							disabled={dialog.isPending}
							onClick={dialog.onRemove}
						>
							Quitar ajuste
						</Button>
					) : null}
				</div>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						disabled={dialog.isPending}
						onClick={onClose}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						disabled={dialog.isSaveDisabled}
						onClick={dialog.onSubmit}
					>
						{dialog.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : null}
						Guardar ajuste
					</Button>
				</div>
			</DialogFooter>
		</div>
	);
}
