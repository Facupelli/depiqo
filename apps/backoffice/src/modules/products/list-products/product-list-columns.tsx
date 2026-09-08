import type { GetRentableItemsItemDto } from "@repo/api-contracts";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PackageOpen } from "lucide-react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { ProductStatusBadge } from "../product-status-badge";

export { ProductStatusBadge } from "../product-status-badge";

const kindLabels = {
	SINGLE: "Individual",
	PACKAGE: "Combo",
	KIT: "Kit",
} satisfies Partial<Record<GetRentableItemsItemDto["kind"], string>>;

const billingUnitLabels: NonNullable<
	GetRentableItemsItemDto["startingPrice"]
> extends { billingUnit: infer T }
	? Record<T & string, string>
	: never = {
	HOUR: "hora",
	DAY: "día",
	WEEK: "semana",
};

export function getProductKindLabel(
	kind: GetRentableItemsItemDto["kind"],
): string {
	return kindLabels[kind as keyof typeof kindLabels] ?? kind;
}

export function getProductCategoryLabel(
	item: GetRentableItemsItemDto,
	categoryNameById: Map<string, string>,
): string {
	if (!item.categoryId) return "Sin categoría";
	return categoryNameById.get(item.categoryId) ?? item.categoryId;
}

export function getProductBranchSummary(item: GetRentableItemsItemDto): string {
	const branchNames = Array.from(
		new Set(item.offers.map((offer) => offer.branchName ?? offer.branchId)),
	);

	return branchNames.length > 0 ? branchNames.join(", ") : "Sin sucursales";
}

export function getProductStartingPriceLabel(
	item: GetRentableItemsItemDto,
): string {
	if (!item.startingPrice) return "Sin precio";

	return `Desde ${formatCurrency(item.startingPrice.amount, item.startingPrice.currency)} / ${billingUnitLabels[item.startingPrice.billingUnit]}`;
}

export function getProductEquipmentCountLabel(
	item: GetRentableItemsItemDto,
): string {
	const count = item.requiredEquipment.length;
	return count === 1 ? "1 equipo" : `${count} equipos`;
}

export function ProductImage({ item }: { item: GetRentableItemsItemDto }) {
	const imageUrl = buildR2PublicUrl(item.imageUrl, "catalog");

	return imageUrl ? (
		<img
			src={imageUrl}
			alt={item.name}
			className="h-12 w-12 shrink-0 rounded-lg border object-cover"
		/>
	) : (
		<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
			<PackageOpen className="h-5 w-5" />
		</div>
	);
}

export function createProductListColumns({
	categoryNameById,
	isSingleBranchScope,
}: {
	categoryNameById: Map<string, string>;
	isSingleBranchScope: boolean;
}): ColumnDef<GetRentableItemsItemDto>[] {
	return [
		{
			id: "item",
			accessorKey: "name",
			header: "Producto",
			cell: ({ row }) => {
				const item = row.original;
				const categoryLabel = getProductCategoryLabel(item, categoryNameById);

				return (
					<div className="flex min-w-52 items-center gap-3">
						<ProductImage item={item} />
						<div className="min-w-0">
							<Link
								to="/dashboard/catalog/$rentableItemId"
								params={{ rentableItemId: item.id }}
								preload={false}
								onClick={(event) => event.stopPropagation()}
								className="block break-words rounded-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring @5xl/catalog-index:truncate"
							>
								{item.name}
							</Link>
							<p className="break-words text-xs text-muted-foreground @5xl/catalog-index:truncate">
								{getProductKindLabel(item.kind)}
								<span className="@5xl/catalog-index:hidden">
									{" · "}
									{categoryLabel}
								</span>
							</p>
							{isSingleBranchScope ? null : (
								<p className="break-words text-xs text-muted-foreground @5xl/catalog-index:hidden">
									{getProductBranchSummary(item)}
								</p>
							)}
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
			cell: ({ row }) =>
				getProductCategoryLabel(row.original, categoryNameById),
		},
		...(isSingleBranchScope
			? []
			: [
					{
						id: "offers",
						header: "Sucursales",
						cell: ({ row }) => getProductBranchSummary(row.original),
					} satisfies ColumnDef<GetRentableItemsItemDto>,
				]),
		{
			id: "startingPrice",
			header: "Precio",
			cell: ({ row }) => getProductStartingPriceLabel(row.original),
		},
		{
			id: "requiredEquipment",
			header: "Equipo",
			cell: ({ row }) => getProductEquipmentCountLabel(row.original),
		},
	];
}

function formatCurrency(amount: string, currency: string) {
	const numericAmount = Number(amount);

	if (!Number.isFinite(numericAmount)) return `${currency} ${amount}`;

	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(numericAmount);
}
