import type { ListEquipmentTypesItemDto } from "@repo/api-contracts";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PackageOpen } from "lucide-react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { EquipmentListRowActions } from "./equipment-list-row-actions";

const billingUnitLabels = {
	HOUR: "hora",
	DAY: "día",
	WEEK: "semana",
} satisfies Record<
	NonNullable<
		ListEquipmentTypesItemDto["rentalSummary"]["startingPrice"]
	>["billingUnit"],
	string
>;

export function getEquipmentUnitCountLabel(count: number): string {
	return count === 1 ? "1 unidad" : `${count} unidades`;
}

export function getEquipmentRentalSummaryLabel(
	item: ListEquipmentTypesItemDto,
): string | null {
	const facts: string[] = [];
	const { standaloneCount, comboCount, startingPrice } = item.rentalSummary;

	if (standaloneCount === 1) facts.push("Individual");
	else if (standaloneCount > 1)
		facts.push(`${standaloneCount} formas de alquiler`);

	if (startingPrice) {
		facts.push(
			`Desde ${formatCurrency(startingPrice.amount, startingPrice.currency)}/${billingUnitLabels[startingPrice.billingUnit]}`,
		);
	}

	if (comboCount === 1) facts.push("En 1 combo");
	else if (comboCount > 1) facts.push(`En ${comboCount} combos`);

	return facts.length > 0 ? facts.join(" · ") : null;
}

export function EquipmentImage({ item }: { item: ListEquipmentTypesItemDto }) {
	const imageUrl = buildR2PublicUrl(item.imageUrl, "catalog");

	return imageUrl ? (
		<img
			src={imageUrl}
			alt={item.name}
			className="size-12 shrink-0 rounded-lg border object-cover"
		/>
	) : (
		<div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
			<PackageOpen className="size-5" />
		</div>
	);
}

export function createEquipmentListColumns({
	showBranchStock,
	onEdit,
	onAddUnit,
}: {
	showBranchStock: boolean;
	onEdit: (equipmentTypeId: string) => void;
	onAddUnit: (equipmentTypeId: string) => void;
}): ColumnDef<ListEquipmentTypesItemDto>[] {
	return [
		{
			id: "equipment",
			accessorKey: "name",
			header: "Equipo",
			cell: ({ row }) => {
				const item = row.original;
				return (
					<div className="flex min-w-52 items-center gap-3">
						<EquipmentImage item={item} />
						<div className="min-w-0">
							<Link
								to="/dashboard/inventory/equipment-types/$equipmentTypeId"
								params={{ equipmentTypeId: item.id }}
								preload={false}
								onClick={(event) => event.stopPropagation()}
								className="block truncate rounded-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{item.name}
							</Link>
							<p className="truncate text-muted-foreground text-xs">
								{item.category?.name ?? "Sin categoría"}
							</p>
						</div>
					</div>
				);
			},
		},
		{
			id: "units",
			header: "Unidades",
			cell: ({ row }) =>
				getEquipmentUnitCountLabel(row.original.activeUnitCount),
		},
		...(showBranchStock
			? [
					{
						id: "branch",
						header: "Sucursal",
						cell: ({ row }) =>
							getEquipmentUnitCountLabel(
								row.original.selectedBranchUnitCount ?? 0,
							),
					} satisfies ColumnDef<ListEquipmentTypesItemDto>,
				]
			: []),
		{
			id: "rental",
			header: "Alquiler",
			cell: ({ row }) => (
				<span className="text-sm">
					{getEquipmentRentalSummaryLabel(row.original) ?? (
						<span className="text-muted-foreground">-</span>
					)}
				</span>
			),
		},
		{
			id: "actions",
			header: "Acciones",
			cell: ({ row }) => (
				<EquipmentListRowActions
					equipmentName={row.original.name}
					onEdit={() => onEdit(row.original.id)}
					onAddUnit={() => onAddUnit(row.original.id)}
				/>
			),
		},
	];
}

function formatCurrency(amount: string, currency: string): string {
	const numericAmount = Number(amount);
	if (!Number.isFinite(numericAmount)) return `${currency} ${amount}`;

	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(numericAmount);
}
