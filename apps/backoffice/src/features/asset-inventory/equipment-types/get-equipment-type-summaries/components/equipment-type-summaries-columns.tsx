import type { GetEquipmentTypeSummariesItemDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

export const equipmentTypeSummariesColumns: ColumnDef<GetEquipmentTypeSummariesItemDto>[] =
	[
		{
			id: "name",
			accessorKey: "name",
			header: "Nombre",
			cell: ({ row }) => {
				const equipmentType = row.original;

				return (
					<div className="min-w-52">
						<Link
							to="/dashboard/inventory/equipment-types/$equipmentTypeId"
							params={{ equipmentTypeId: equipmentType.id }}
							preload={false}
							onClick={(event) => event.stopPropagation()}
							className="block truncate rounded-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{equipmentType.name}
						</Link>
					</div>
				);
			},
		},
		{
			id: "assetsQuantity",
			accessorKey: "assetsQuantity",
			header: "Assets",
			cell: ({ row }) =>
				formatQuantity(row.original.assetsQuantity, "asset", "assets"),
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
		{
			id: "stockPerBranch",
			header: "Stock por sucursal",
			cell: ({ row }) => {
				const stock = row.original.stockPerBranch;

				if (stock.length === 0) {
					return "Sin stock";
				}

				return (
					<div className="flex max-w-md flex-wrap gap-1.5">
						{stock.map((item) => (
							<Badge
								key={item.branchId}
								variant="outline"
								className="font-normal"
							>
								{item.branchName ?? item.branchId}: {item.quantity}
							</Badge>
						))}
					</div>
				);
			},
		},
	];

function formatQuantity(quantity: number, singular: string, plural: string) {
	return quantity === 1 ? `1 ${singular}` : `${quantity} ${plural}`;
}
