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
	AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { getActivateProductErrorMessage } from "./activate-product.errors";
import { useActivateProduct } from "./activate-product.mutation";

export function ActivateProductAction({
	product,
}: {
	product: GetRentableItemDetailResponseDto;
}) {
	const [open, setOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const activateMutation = useActivateProduct();

	async function handleActivate() {
		setErrorMessage(null);
		try {
			await activateMutation.mutateAsync({ rentableItemId: product.id });
			setOpen(false);
		} catch (error) {
			setErrorMessage(getActivateProductErrorMessage(error, product));
		}
	}

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) setErrorMessage(null);
			}}
		>
			<AlertDialogTrigger
				render={
					<Button
						type="button"
						variant="outline"
						size="lg"
						disabled={activateMutation.isPending}
					>
						<CheckCircle2 className="mr-2 size-4" />
						{activateMutation.isPending ? "Activando..." : "Activar"}
					</Button>
				}
			/>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Activar producto</AlertDialogTitle>
					<AlertDialogDescription>
						Al activar este producto, aparecerá en el catálogo de tu tienda para
						que tus clientes puedan verlo y solicitarlo.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{errorMessage ? (
					<p className="text-sm text-destructive">{errorMessage}</p>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={activateMutation.isPending}>
						Cancelar
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleActivate}
						disabled={activateMutation.isPending}
					>
						{activateMutation.isPending ? "Activando..." : "Activar producto"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
