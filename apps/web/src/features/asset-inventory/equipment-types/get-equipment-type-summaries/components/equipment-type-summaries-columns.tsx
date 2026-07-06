import type { GetEquipmentTypeSummariesItemDto } from "@repo/api-contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
						<p className="truncate font-medium text-foreground">
							{equipmentType.name}
						</p>
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
			id: "status",
			accessorKey: "isActive",
			header: "Estado",
			cell: ({ row }) => (
				<EquipmentTypeStatusBadge isActive={row.original.isActive} />
			),
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
		{
			id: "actions",
			header: () => <span className="sr-only">Acciones</span>,
			cell: ({ row }) => (
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="ml-auto h-8 w-8"
								onClick={(event) => event.stopPropagation()}
							>
								<span className="sr-only">Abrir acciones</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						}
					/>
					<DropdownMenuContent align="end" className="w-40">
						<DropdownMenuItem
							onClick={(event) => {
								event.stopPropagation();
								// TODO: navigate to equipment type detail route.
								void row.original.id;
							}}
						>
							Ver detalle
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

function EquipmentTypeStatusBadge({ isActive }: { isActive: boolean }) {
	return isActive ? (
		<Badge className="bg-emerald-600 text-white">Activo</Badge>
	) : (
		<Badge variant="secondary">Inactivo</Badge>
	);
}

function formatQuantity(quantity: number, singular: string, plural: string) {
	return quantity === 1 ? `1 ${singular}` : `${quantity} ${plural}`;
}
