import type { GetRentableItemsItemDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PackageOpen } from "lucide-react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";

const kindLabels = {
	SINGLE: "Individual",
	PACKAGE: "Combo",
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

export function createProductListColumns({
	categoryNameById,
}: {
	categoryNameById: Map<string, string>;
}): ColumnDef<GetRentableItemsItemDto>[] {
	return [
		{
			id: "item",
			accessorKey: "name",
			header: "Producto",
			cell: ({ row }) => {
				const item = row.original;
				const imageUrl = buildR2PublicUrl(item.imageUrl, "catalog");

				return (
					<div className="flex min-w-52 items-center gap-3">
						{imageUrl ? (
							<img
								src={imageUrl}
								alt={item.name}
								className="h-12 w-12 rounded-lg border object-cover"
							/>
						) : (
							<div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
								<PackageOpen className="h-5 w-5" />
							</div>
						)}
						<div className="min-w-0">
							<Link
								to="/dashboard/catalog/$rentableItemId"
								params={{ rentableItemId: item.id }}
								preload={false}
								onClick={(event) => event.stopPropagation()}
								className="block truncate rounded-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{item.name}
							</Link>
							<p className="truncate text-xs text-muted-foreground">
								{getKindLabel(item.kind)}
							</p>
						</div>
					</div>
				);
			},
		},
		{
			id: "status",
			accessorKey: "status",
			header: "Estado",
			cell: ({ row }) => <ProductStatusBadge status={row.original.status} />,
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
			header: "Sucursales",
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
			id: "startingPrice",
			header: "Precio",
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
			header: "Equipo",
			cell: ({ row }) => {
				const count = row.original.requiredEquipment.length;
				return count === 1 ? "1 equipo" : `${count} equipos`;
			},
		},
	];
}

function ProductStatusBadge({
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
