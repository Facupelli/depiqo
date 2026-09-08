import type { GetEquipmentTypeSummaryResponseDto } from "@repo/api-contracts";

export function EquipmentOverview({
	summary,
}: {
	summary: GetEquipmentTypeSummaryResponseDto;
}) {
	return (
		<section className="overflow-hidden rounded-xl border bg-card shadow-xs">
			<div className="border-b px-5 py-4 sm:px-6">
				<h2 className="font-semibold tracking-tight">Información del equipo</h2>
			</div>
			<dl className="grid gap-x-8 gap-y-6 px-5 py-6 sm:grid-cols-2 sm:px-6">
				<EquipmentFact label="Nombre" value={summary.name} />
				<EquipmentFact
					label="Categoría"
					value={summary.categoryName ?? "Sin categoría"}
				/>
				<EquipmentFact
					label="Descripción"
					value={summary.description ?? "Sin descripción"}
					className="sm:col-span-2"
				/>
				<EquipmentFact
					label="Unidades activas"
					value={String(summary.activeAssetCount)}
				/>
			</dl>
		</section>
	);
}

function EquipmentFact({
	label,
	value,
	className,
}: {
	label: string;
	value: string;
	className?: string;
}) {
	return (
		<div className={className}>
			<dt className="text-sm font-medium text-muted-foreground">{label}</dt>
			<dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">
				{value}
			</dd>
		</div>
	);
}
