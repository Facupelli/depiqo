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
import { CheckCircle2, CircleDollarSign } from "lucide-react";
import { useState } from "react";
import { PRODUCT_AVAILABILITY_SECTION_ID } from "@/modules/products/product-detail/ProductAvailabilitySection";
import {
	type ActivateProductUiError,
	getActivateProductError,
} from "./activate-product.errors";
import { useActivateProduct } from "./activate-product.mutation";

export function ActivateProductAction({
	product,
}: {
	product: GetRentableItemDetailResponseDto;
}) {
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<ActivateProductUiError | null>(null);
	const activateMutation = useActivateProduct();

	async function handleActivate() {
		setError(null);
		try {
			await activateMutation.mutateAsync({ rentableItemId: product.id });
			setOpen(false);
		} catch (mutationError) {
			setError(getActivateProductError(mutationError));
		}
	}

	function handleConfigurePricing() {
		setOpen(false);
		requestAnimationFrame(() => {
			document
				.getElementById(PRODUCT_AVAILABILITY_SECTION_ID)
				?.scrollIntoView({ behavior: "smooth", block: "start" });
		});
	}

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) setError(null);
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
				{error ? (
					<div className="flex flex-col items-start gap-2">
						<p className="text-sm text-destructive">{error.message}</p>
						{error.action === "configure-pricing" ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleConfigurePricing}
							>
								<CircleDollarSign className="mr-2 size-4" />
								Configurar precio
							</Button>
						) : null}
					</div>
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
