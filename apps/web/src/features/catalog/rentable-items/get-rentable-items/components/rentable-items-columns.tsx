import type { GetRentableItemsItemDto } from "@repo/api-contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildR2PublicUrl } from "@/lib/r2-public-url";

const kindLabels = {
	SINGLE: "Individual",
	PACKAGE: "Paquete",
	KIT: "Kit",
} satisfies Partial<Record<GetRentableItemsItemDto["kind"], string>>;

function getKindLabel(kind: GetRentableItemsItemDto["kind"]): string {
	return kindLabels[kind as keyof typeof kindLabels] ?? kind;
}

const statusLabels: Record<GetRentableItemsItemDto["status"], string> = {
	DRAFT: "Borrador",
	ACTIVE: "Activo",
	ARCHIVED: "Archivado",
};

const billingUnitLabels: NonNullable<
	GetRentableItemsItemDto["startingPrice"]
> extends { billingUnit: infer T }
	? Record<T & string, string>
	: never = {
	HOUR: "hora",
	DAY: "día",
	WEEK: "semana",
};

export function createRentableItemsColumns({
	categoryNameById,
}: {
	categoryNameById: Map<string, string>;
}): ColumnDef<GetRentableItemsItemDto>[] {
	return [
		{
			id: "item",
			accessorKey: "name",
			header: "Ítem",
			cell: ({ row }) => {
				const item = row.original;
				const imageUrl = buildR2PublicUrl(item.imageUrl, "catalog");

				return (
					<div className="flex min-w-52 items-center gap-3">
						{imageUrl ? (
							<img
								src={imageUrl}
								alt={item.name}
								className="h-11 w-11 rounded-lg border object-cover"
							/>
						) : (
							<div className="flex h-11 w-11 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
								<PackageOpen className="h-5 w-5" />
							</div>
						)}
						<div className="min-w-0">
							<p className="truncate font-medium text-foreground">
								{item.name}
							</p>
							<p className="truncate text-xs text-muted-foreground">
								{item.id}
							</p>
						</div>
					</div>
				);
			},
		},
		{
			id: "kind",
			accessorKey: "kind",
			header: "Tipo",
			cell: ({ row }) => getKindLabel(row.original.kind),
		},
		{
			id: "category",
			accessorKey: "categoryId",
			header: "Categoría",
			cell: ({ row }) => {
				const categoryId = row.original.categoryId;

				if (!categoryId) {
					return "Sin categoría";
				}

				return categoryNameById.get(categoryId) ?? categoryId;
			},
		},
		{
			id: "offers",
			header: "Disponible en sucursales",
			cell: ({ row }) => {
				const branchNames = Array.from(
					new Set(
						row.original.offers.map(
							(offer) => offer.branchName ?? offer.branchId,
						),
					),
				);

				return branchNames.length > 0
					? branchNames.join(", ")
					: "Sin sucursales";
			},
		},
		{
			id: "status",
			accessorKey: "status",
			header: "Estado",
			cell: ({ row }) => (
				<RentableItemStatusBadge status={row.original.status} />
			),
		},
		{
			id: "startingPrice",
			header: "Precio inicial",
			cell: ({ row }) => {
				const { startingPrice } = row.original;

				if (!startingPrice) {
					return "Sin precio";
				}

				return `Desde ${formatCurrency(startingPrice.amount, startingPrice.currency)} / ${billingUnitLabels[startingPrice.billingUnit]}`;
			},
		},
		{
			id: "requiredEquipment",
			header: "Equipo requerido",
			cell: ({ row }) => {
				const count = row.original.requiredEquipment.length;
				return count === 1 ? "1 equipo" : `${count} equipos`;
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
								// TODO: navigate to rentable item detail route.
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
}

function RentableItemStatusBadge({
	status,
}: {
	status: GetRentableItemsItemDto["status"];
}) {
	if (status === "ACTIVE") {
		return <Badge className="bg-emerald-600 text-white">Activo</Badge>;
	}

	if (status === "DRAFT") {
		return <Badge variant="secondary">Borrador</Badge>;
	}

	return <Badge variant="outline">{statusLabels[status]}</Badge>;
}

function formatCurrency(amount: string, currency: string) {
	const numericAmount = Number(amount);

	if (!Number.isFinite(numericAmount)) {
		return `${currency} ${amount}`;
	}

	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(numericAmount);
}
