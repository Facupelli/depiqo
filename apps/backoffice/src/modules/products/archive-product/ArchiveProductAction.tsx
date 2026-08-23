import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
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
	product,
	open,
	onOpenChange,
}: {
	product: GetRentableItemDetailResponseDto;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [error, setError] = useState<ArchiveProductUiError | null>(null);
	const archiveMutation = useArchiveProduct();

	async function handleArchive() {
		setError(null);
		try {
			await archiveMutation.mutateAsync({ rentableItemId: product.id });
			onOpenChange(false);
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
					<AlertDialogTitle>Archivar producto</AlertDialogTitle>
					<AlertDialogDescription>
						Una vez archivado, este producto ya no estará disponible para nuevos
						alquileres. Los alquileres existentes no se modifican. Esta acción
						no elimina el producto.
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
