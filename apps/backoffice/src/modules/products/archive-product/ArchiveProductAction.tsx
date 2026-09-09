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
import { useState } from "react";
import {
	type ArchiveProductUiError,
	getArchiveProductError,
} from "./archive-product.errors";
import { useArchiveProduct } from "./archive-product.mutation";

export function ArchiveProductAction({
	rentableItemId,
	open,
	onOpenChange,
	onSuccess,
	terminology = "producto",
}: {
	rentableItemId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void | Promise<void>;
	terminology?: "producto" | "combo";
}) {
	const [error, setError] = useState<ArchiveProductUiError | null>(null);
	const archiveMutation = useArchiveProduct();

	async function handleArchive() {
		setError(null);
		try {
			await archiveMutation.mutateAsync({ rentableItemId });
			onOpenChange(false);
			await onSuccess?.();
		} catch (mutationError) {
			setError(getArchiveProductError(mutationError));
		}
	}

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen);
				if (!nextOpen) setError(null);
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Archivar {terminology}</AlertDialogTitle>
					<AlertDialogDescription>
						Una vez archivado, este {terminology} ya no estará disponible para
						nuevos alquileres. Los alquileres existentes no se modifican. Esta
						acción no elimina el {terminology}.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{error ? (
					<p className="text-destructive text-sm">{error.message}</p>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={archiveMutation.isPending}>
						Cancelar
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleArchive}
						disabled={archiveMutation.isPending}
					>
						{archiveMutation.isPending ? "Archivando..." : "Archivar"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
