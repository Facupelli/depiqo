import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProblemDetailsError } from "@/shared/errors";
import { useDeletePromotion } from "../promotions.mutations";

interface DeletablePromotion {
	id: string;
	name: string;
}

interface DeletePromotionAlertDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	promotion: DeletablePromotion | null;
}

export function DeletePromotionAlertDialog({
	open,
	onOpenChange,
	promotion,
}: DeletePromotionAlertDialogProps) {
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// TODO: Replace this old delete flow when a v2 delete promotion mutation is available.
	const { mutateAsync: deletePromotion, isPending } = useDeletePromotion();

	if (!promotion) {
		return null;
	}

	async function handleDelete() {
		setErrorMessage(null);

		try {
			await deletePromotion({ promotionId: promotion.id });
			onOpenChange(false);
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				setErrorMessage(
					error.problemDetails.detail ??
						error.problemDetails.title ??
						"No se pudo eliminar la promocion.",
				);
				return;
			}

			setErrorMessage("Ocurrio un error al eliminar la promocion.");
		}
	}

	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					setErrorMessage(null);
				}

				onOpenChange(next);
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Eliminar promocion</AlertDialogTitle>
					<AlertDialogDescription>
						Estas por eliminar la promocion "{promotion.name}". Esta accion no
						se puede deshacer.
					</AlertDialogDescription>
				</AlertDialogHeader>

				{errorMessage && (
					<p className="text-sm text-destructive">{errorMessage}</p>
				)}

				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={handleDelete}
						disabled={isPending}
					>
						{isPending ? "Eliminando..." : "Eliminar"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
