import { Button } from "@/components/ui/button";

export function RentalAccessoryPreparationPlaceholder({
	onClose,
}: {
	onClose: () => void;
}) {
	return (
		<section className="rounded-xl border border-neutral-200 bg-white p-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold text-neutral-950">
						Asignación de accesorios
					</h2>
					<p className="mt-1 text-sm text-neutral-500">
						Este flujo todavía no está migrado a v2. Los accesorios ya asignados
						se muestran en el detalle del pedido.
					</p>
				</div>
				<Button variant="outline" onClick={onClose}>
					Volver
				</Button>
			</div>
		</section>
	);
}
