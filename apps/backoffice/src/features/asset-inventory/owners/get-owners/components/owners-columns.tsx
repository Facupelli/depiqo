import type { GetOwnersItemDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export const ownerColumns: ColumnDef<GetOwnersItemDto>[] = [
	{
		accessorKey: "name",
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				className="px-0 hover:bg-transparent"
			>
				Propietario
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				className="px-0 hover:bg-transparent"
			>
				Creado el
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => {
			const date = new Date(row.getValue("createdAt"));

			return (
				<span className="text-muted-foreground">
					{date.toLocaleDateString("es-ES", {
						year: "numeric",
						month: "short",
						day: "numeric",
					})}
				</span>
			);
		},
	},
	{
		id: "actions",
		header: "Acciones",
		cell: () => null,
	},
];
