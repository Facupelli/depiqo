import type { GetOwnersItemDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { formatTimestampInTimezone } from "@/lib/dates/format";

export function createOwnerColumns(
	timezone: string,
): ColumnDef<GetOwnersItemDto>[] {
	return [
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
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{formatTimestampInTimezone(
						row.getValue("createdAt"),
						timezone,
						"DD MMM, YYYY · HH:mm",
					)}
				</span>
			),
		},
		{
			id: "actions",
			header: "Acciones",
			cell: () => null,
		},
	];
}
