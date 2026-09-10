import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Link } from "@tanstack/react-router";
import { PackageOpen } from "lucide-react";

export function ComboEquipmentSection({
	combo,
}: {
	combo: GetRentableItemDetailResponseDto;
}) {
	return (
		<section className="space-y-4">
			<div>
				<h2 className="font-semibold">Equipos del combo</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Definición completa del equipo necesario para preparar una unidad del
					combo.
				</p>
			</div>
			<div className="overflow-hidden rounded-lg border bg-card">
				{combo.requiredEquipment.length === 0 ? (
					<div className="flex min-h-32 flex-col items-center justify-center p-6 text-center">
						<PackageOpen className="mb-3 size-7 text-muted-foreground" />
						<p className="font-medium">
							Este combo no tiene equipos definidos.
						</p>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/40 hover:bg-muted/40">
								<TableHead className="px-5 sm:px-6">Equipo</TableHead>
								<TableHead className="w-36 px-5 text-right sm:px-6">
									Cantidad
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{combo.requiredEquipment.map((requirement) => (
								<TableRow
									key={requirement.equipmentTypeId}
									className="hover:bg-transparent"
								>
									<TableCell className="px-5 py-3 sm:px-6">
										<Link
											to="/dashboard/inventory/equipment-types/$equipmentTypeId"
											params={{ equipmentTypeId: requirement.equipmentTypeId }}
											className="font-medium text-primary hover:underline"
										>
											{requirement.equipmentTypeName ??
												requirement.equipmentTypeId}
										</Link>
									</TableCell>
									<TableCell className="w-36 px-5 py-3 text-right font-medium tabular-nums sm:px-6">
										{requirement.quantityPerItem}{" "}
										{requirement.quantityPerItem === 1 ? "unidad" : "unidades"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</section>
	);
}
