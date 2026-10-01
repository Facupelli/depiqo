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
import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";
import { useRestoreProduct } from "./restore-product.mutation";

export function RestoreProductAction({
	rentableItemId,
	open,
	onOpenChange,
	terminology = "producto",
}: {
	rentableItemId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	terminology?: "producto" | "combo";
}) {
	const [error, setError] = useState<string | null>(null);
	const mutation = useRestoreProduct();

	async function handleRestore() {
		setError(null);
		try {
			await mutation.mutateAsync({ rentableItemId });
			onOpenChange(false);
		} catch (cause) {
			setError(
				cause instanceof ProblemDetailsError &&
					getProblemDetailsCode(cause) === "catalog.rentable_item_not_found"
					? "No encontramos este producto. Actualiza la página e inténtalo de nuevo."
					: "No pudimos restaurar el producto. Inténtalo de nuevo.",
			);
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
					<AlertDialogTitle>Restaurar {terminology}</AlertDialogTitle>
					<AlertDialogDescription>
						Se conservará la configuración de este {terminology}. Al
						restaurarlo, las sucursales configuradas como visibles volverán a
						mostrarse y las que permiten alquileres podrán seleccionarse de
						nuevo. Se requieren precios válidos y equipos disponibles para
						reservar.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{error ? <p className="text-destructive text-sm">{error}</p> : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={mutation.isPending}>
						Cancelar
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleRestore}
						disabled={mutation.isPending}
					>
						{mutation.isPending ? "Restaurando..." : "Restaurar"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
