import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { ProductStatusBadge } from "../product-status-badge";
export function ComboSummarySection({
	combo,
}: {
	combo: GetRentableItemDetailResponseDto;
}) {
	const facts = [
		{ label: "Nombre", value: combo.name },
		{ label: "Categoría", value: combo.categoryName ?? "Sin categoría" },
		{ label: "Descripción", value: combo.description ?? "Sin descripción" },
	];
	return (
		<section className="rounded-xl border bg-card">
			<div className="border-b px-5 py-4 sm:px-6">
				<h2 className="font-semibold">Información del combo</h2>
			</div>
			<dl className="grid gap-x-8 gap-y-6 px-5 py-6 sm:grid-cols-2 sm:px-6">
				{facts.map((fact) => (
					<div key={fact.label}>
						<dt className="text-sm text-muted-foreground">{fact.label}</dt>
						<dd className="mt-1 whitespace-pre-wrap font-medium">
							{fact.value}
						</dd>
					</div>
				))}
				<div>
					<dt className="text-sm text-muted-foreground">Estado</dt>
					<dd className="mt-1">
						<ProductStatusBadge status={combo.status} />
					</dd>
				</div>
				<div>
					<dt className="text-sm text-muted-foreground">Equipos requeridos</dt>
					<dd className="mt-1 font-medium">{combo.requiredEquipment.length}</dd>
				</div>
				<div>
					<dt className="text-sm text-muted-foreground">Sucursales</dt>
					<dd className="mt-1 font-medium">{combo.offers.length}</dd>
				</div>
			</dl>
		</section>
	);
}
