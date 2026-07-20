import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import type { ReactNode } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";

export function RentableItemRequiredEquipmentSection({
	item,
}: {
	item: GetRentableItemDetailResponseDto;
}) {
	return (
		<DetailTable
			title="Equipo requerido"
			description="Equipos necesarios para poder cumplir el alquiler de este ítem."
			colSpan={3}
			isEmpty={item.requiredEquipment.length === 0}
			emptyMessage="No hay equipo requerido."
		>
			<TableHeader className="bg-muted/50">
				<TableRow>
					<TableHead>Nombre</TableHead>
					<TableHead>Cantidad</TableHead>
					<TableHead>Notas</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{item.requiredEquipment.map((equipment) => (
					<TableRow key={equipment.equipmentTypeId}>
						<TableCell className="font-medium">
							{equipment.equipmentTypeName ?? equipment.equipmentTypeId}
						</TableCell>
						<TableCell>{equipment.quantityPerItem}</TableCell>
						<TableCell className="text-muted-foreground">
							{equipment.notes ??
								equipment.equipmentTypeDescription ??
								"Sin notas"}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</DetailTable>
	);
}

function DetailTable({
	children,
	colSpan,
	isEmpty,
	emptyMessage,
	title,
	description,
}: {
	children: ReactNode;
	colSpan: number;
	isEmpty: boolean;
	emptyMessage: string;
	title: string;
	description?: string;
}) {
	return (
		<section className="overflow-hidden rounded-2xl border bg-background shadow-sm">
			<div className="px-5 pt-5 pb-3">
				<h2 className="font-semibold text-lg tracking-tight">{title}</h2>
				{description ? (
					<p className="mt-1 text-sm text-muted-foreground">{description}</p>
				) : null}
			</div>
			<div className="px-5 pb-5">
				<Table className="rounded-xl border">
					{children}
					{isEmpty ? (
						<TableBody>
							<TableRow>
								<TableCell
									colSpan={colSpan}
									className="h-28 text-center text-muted-foreground"
								>
									{emptyMessage}
								</TableCell>
							</TableRow>
						</TableBody>
					) : null}
				</Table>
			</div>
		</section>
	);
}
