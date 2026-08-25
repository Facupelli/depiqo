import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReplaceAssignedAssetDialog } from "./use-replace-assigned-asset-dialog";

interface ReplaceAssignedAssetDialogProps {
	currentAssignedAssetId: string | null;
	onClose: () => void;
}

export function ReplaceAssignedAssetDialog({
	currentAssignedAssetId,
	onClose,
}: ReplaceAssignedAssetDialogProps) {
	const dialog = useReplaceAssignedAssetDialog({
		currentAssignedAssetId,
		onClose,
	});
	const open = currentAssignedAssetId !== null && dialog.target !== null;

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) dialog.requestClose();
			}}
		>
			<DialogContent
				className="sm:max-w-lg"
				showCloseButton={!dialog.isSubmitting}
			>
				<DialogHeader>
					<DialogTitle>Reemplazar equipo asignado</DialogTitle>
					<DialogDescription>
						Elegí otro equipo físico para esta asignación.
					</DialogDescription>
				</DialogHeader>

				{dialog.target ? (
					<div className="space-y-5">
						<div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
							<p className="text-muted-foreground text-xs">Equipo actual</p>
							<p className="mt-1 font-mono font-semibold text-neutral-900">
								{dialog.target.label}
							</p>
						</div>

						<div className="space-y-3">
							<p className="font-medium text-sm">
								Seleccioná el equipo de reemplazo
							</p>
							<CandidateList dialog={dialog} />
						</div>

						{dialog.replacementSummary ? (
							<div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center font-mono font-semibold text-sm">
								{dialog.replacementSummary}
							</div>
						) : null}

						{dialog.submitErrorMessage ? (
							<div className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive text-sm">
								<AlertCircle className="mt-0.5 size-4 shrink-0" />
								<p>{dialog.submitErrorMessage}</p>
							</div>
						) : null}

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								disabled={dialog.isSubmitting}
								onClick={dialog.requestClose}
							>
								Cancelar
							</Button>
							<Button
								type="button"
								disabled={!dialog.canSubmit}
								onClick={dialog.submit}
							>
								{dialog.isSubmitting ? (
									<Loader2 className="size-4 animate-spin" />
								) : null}
								Reemplazar equipo
							</Button>
						</DialogFooter>
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

type DialogController = ReturnType<typeof useReplaceAssignedAssetDialog>;

function CandidateList({ dialog }: { dialog: DialogController }) {
	if (
		dialog.candidates.state === "loading" ||
		dialog.candidates.state === "refreshing"
	) {
		return (
			<div className="flex min-h-28 items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground text-sm">
				<Loader2 className="size-4 animate-spin" />
				{dialog.candidates.state === "loading"
					? "Cargando equipos disponibles..."
					: "Actualizando equipos disponibles..."}
			</div>
		);
	}

	if (dialog.candidates.state === "error") {
		return (
			<div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm">
				<p className="text-destructive">
					No pudimos cargar los equipos disponibles.
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-3"
					onClick={dialog.candidates.retry}
				>
					<RefreshCw className="size-3.5" />
					Reintentar
				</Button>
			</div>
		);
	}

	if (dialog.candidates.state === "empty") {
		return (
			<div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4 text-muted-foreground text-sm">
				No hay otros equipos disponibles para reemplazar esta asignación.
			</div>
		);
	}

	return (
		<div className="max-h-64 space-y-2 overflow-y-auto">
			{dialog.candidates.items.map((candidate) => {
				const label = candidate.serialNumber?.trim() || candidate.assetId;
				const selected =
					dialog.selectedReplacementAssetId === candidate.assetId;
				return (
					<label
						key={candidate.assetId}
						className={cn(
							"flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
							selected
								? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
								: "border-neutral-200 hover:border-neutral-300",
							dialog.isSubmitting && "cursor-not-allowed opacity-60",
						)}
					>
						<input
							type="radio"
							name="replacement-asset"
							value={candidate.assetId}
							checked={selected}
							disabled={dialog.isSubmitting}
							onChange={() => dialog.selectReplacement(candidate.assetId)}
							className="size-4 accent-neutral-950"
						/>
						<span className="font-mono font-medium">{label}</span>
					</label>
				);
			})}
		</div>
	);
}
