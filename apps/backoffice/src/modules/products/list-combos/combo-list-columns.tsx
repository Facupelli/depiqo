import type { GetRentableItemsItemDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PackageOpen } from "lucide-react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { formatExactCurrencyRate } from "@/shared/utils/formatters";
import { ProductStatusBadge } from "../product-status-badge";
import type { CombosSearch } from "./CombosPage";
import { ComboListRowActions } from "./combo-list-row-actions";

const billingUnitLabels = {
	HOUR: "hora",
	DAY: "día",
	WEEK: "semana",
} satisfies Record<
	NonNullable<GetRentableItemsItemDto["startingPrice"]>["billingUnit"],
	string
>;

export function getComboEquipmentCountLabel(
	item: GetRentableItemsItemDto,
): string {
	const count = item.requiredEquipment.length;
	return count === 1 ? "1 equipo" : `${count} equipos`;
}

export function getComboStartingPriceLabel(
	item: GetRentableItemsItemDto,
): string | null {
	if (!item.startingPrice) return null;

	return `Desde ${formatExactCurrencyRate(item.startingPrice.amount, item.startingPrice.currency)}/${billingUnitLabels[item.startingPrice.billingUnit]}`;
}

export function getComboCategoryLabel(
	item: GetRentableItemsItemDto,
	categoryNameById: Map<string, string>,
): string {
	if (!item.categoryId) return "Sin categoría";
	return categoryNameById.get(item.categoryId) ?? "Sin categoría";
}

export function getComboBranchLabel(item: GetRentableItemsItemDto): string {
	const names = Array.from(
		new Set(
			item.offers.map(
				(offer) => offer.branchName?.trim() || "Sucursal no disponible",
			),
		),
	);
	return names.length > 0 ? names.join(", ") : "Sin sucursales";
}

export function ComboListStatusBadge({
	archivedAt,
}: {
	archivedAt: GetRentableItemsItemDto["archivedAt"];
}) {
	return archivedAt === null ? (
		<Badge variant="secondary">Sin archivar</Badge>
	) : (
		<ProductStatusBadge archivedAt={archivedAt} />
	);
}

export function ComboImage({ item }: { item: GetRentableItemsItemDto }) {
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

export function createComboListColumns({
	categoryNameById,
	archival,
	onArchive,
}: {
	categoryNameById: Map<string, string>;
	archival: CombosSearch["archival"];
	onArchive?: (item: GetRentableItemsItemDto) => void;
}): ColumnDef<GetRentableItemsItemDto>[] {
	return [
		{
			id: "combo",
			accessorKey: "name",
			header: "Combo",
			cell: ({ row }) => {
				const item = row.original;
				return (
					<div className="flex min-w-60 items-center gap-3">
						<ComboImage item={item} />
						<div className="min-w-0">
							<Link
								to="/dashboard/catalog/packages/$rentableItemId"
								params={{ rentableItemId: item.id }}
								preload={false}
								onClick={(event) => event.stopPropagation()}
								className="block truncate rounded-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{item.name}
							</Link>
							<p className="truncate text-muted-foreground text-xs">
								{getComboCategoryLabel(item, categoryNameById)} ·{" "}
								{getComboBranchLabel(item)}
							</p>
						</div>
					</div>
				);
			},
		},
		{
			id: "equipment",
			header: "Equipos",
			cell: ({ row }) => getComboEquipmentCountLabel(row.original),
		},
		{
			id: "rental",
			header: "Alquiler",
			cell: ({ row }) =>
				getComboStartingPriceLabel(row.original) ?? (
					<span className="text-muted-foreground">-</span>
				),
		},
		...(archival === "UNARCHIVED"
			? []
			: [
					{
						id: "archival",
						header: "Estado",
						cell: ({ row }) => (
							<ComboListStatusBadge archivedAt={row.original.archivedAt} />
						),
					} satisfies ColumnDef<GetRentableItemsItemDto>,
				]),
		{
			id: "actions",
			header: "Acciones",
			cell: ({ row }) => (
				<ComboListRowActions item={row.original} onArchive={onArchive} />
			),
		},
	];
}
