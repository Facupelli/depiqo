import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { Link } from "@tanstack/react-router";
import { ArrowRight, PackageOpen } from "lucide-react";
export function ComboEquipmentSection({
	combo,
}: {
	combo: GetRentableItemDetailResponseDto;
}) {
	return (
		<section className="rounded-xl border bg-card">
			<div className="border-b px-5 py-4 sm:px-6">
				<h2 className="font-semibold">Equipos del combo</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Definición completa del equipo necesario para preparar una unidad del
					combo.
				</p>
			</div>
			{combo.requiredEquipment.length === 0 ? (
				<div className="m-5 flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
					<PackageOpen className="mb-3 size-7 text-muted-foreground" />
					<p className="font-medium">Este combo no tiene equipos definidos.</p>
				</div>
			) : (
				<ul className="divide-y">
					{combo.requiredEquipment.map((requirement) => (
						<li
							key={requirement.equipmentTypeId}
							className="flex items-center gap-4 px-5 py-4 sm:px-6"
						>
							<div className="min-w-0 flex-1">
								<Link
									to="/dashboard/inventory/equipment-types/$equipmentTypeId"
									params={{ equipmentTypeId: requirement.equipmentTypeId }}
									className="font-medium text-primary hover:underline"
								>
									{requirement.equipmentTypeName ?? requirement.equipmentTypeId}
								</Link>
								{requirement.equipmentTypeDescription ? (
									<p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
										{requirement.equipmentTypeDescription}
									</p>
								) : null}
							</div>
							<div className="shrink-0 text-right">
								<p className="font-semibold">{requirement.quantityPerItem}</p>
								<p className="text-xs text-muted-foreground">unidades</p>
							</div>
							<ArrowRight className="size-4 shrink-0 text-muted-foreground" />
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
