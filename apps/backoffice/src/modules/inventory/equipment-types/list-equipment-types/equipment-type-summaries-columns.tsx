import type { GetEquipmentTypeSummariesItemDto } from "@repo/api-contracts";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PackageOpen } from "lucide-react";

export const equipmentTypeSummariesColumns: ColumnDef<GetEquipmentTypeSummariesItemDto>[] =
	[
		{
			id: "equipment",
			accessorKey: "name",
			header: "Equipo",
			cell: ({ row }) => {
				const equipmentType = row.original;

				return (
					<div className="flex min-w-52 items-center gap-3">
						{equipmentType.imageUrl ? (
							<img
								src={equipmentType.imageUrl}
								alt={equipmentType.name}
								className="size-12 shrink-0 rounded-lg border object-cover"
							/>
						) : (
							<div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
								<PackageOpen className="size-5" />
							</div>
						)}
						<div className="min-w-0">
							<Link
								to="/dashboard/inventory/equipment-types/$equipmentTypeId"
								params={{ equipmentTypeId: equipmentType.id }}
								preload={false}
								onClick={(event) => event.stopPropagation()}
								className="block truncate rounded-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{equipmentType.name}
							</Link>
							<p className="truncate text-muted-foreground text-xs">
								{equipmentType.categoryName ?? "Sin categoría"}
							</p>
						</div>
					</div>
				);
			},
		},
		{
			id: "assetsQuantity",
			accessorKey: "assetsQuantity",
			header: "Unidades",
			cell: ({ row }) =>
				formatQuantity(row.original.assetsQuantity, "unidad", "unidades"),
		},
		{
			id: "stockPerBranch",
			header: "Sucursales",
			cell: ({ row }) => {
				const stock = row.original.stockPerBranch;

				if (stock.length === 0) {
					return "Sin stock";
				}

				return stock
					.map(
						(item) => `${item.branchName ?? item.branchId} x${item.quantity}`,
					)
					.join(", ");
			},
		},
		{
			id: "commercialUse",
			accessorKey: "rentableItem",
			header: "Uso comercial",
			cell: ({ row }) => (row.original.rentableItem ? "Sí" : "No"),
		},
		{
			id: "accessory",
			accessorKey: "usedAsAccessory",
			header: "Accesorio",
			cell: ({ row }) => (row.original.usedAsAccessory ? "Sí" : "No"),
		},
	];

function formatQuantity(quantity: number, singular: string, plural: string) {
	return quantity === 1 ? `1 ${singular}` : `${quantity} ${plural}`;
}
