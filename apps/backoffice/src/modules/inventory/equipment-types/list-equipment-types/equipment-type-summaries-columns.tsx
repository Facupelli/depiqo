import type {
	EquipmentTypeProductUsageProductDto,
	GetEquipmentTypeSummariesItemDto,
} from "@repo/api-contracts";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PackageOpen } from "lucide-react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";

export function createEquipmentTypeSummariesColumns({
	productsByEquipmentTypeId,
}: {
	productsByEquipmentTypeId: ReadonlyMap<
		string,
		EquipmentTypeProductUsageProductDto[]
	>;
}): ColumnDef<GetEquipmentTypeSummariesItemDto>[] {
	return [
		{
			id: "equipment",
			accessorKey: "name",
			header: "Equipo",
			cell: ({ row }) => {
				const equipmentType = row.original;
				const imageUrl = buildR2PublicUrl(equipmentType.imageUrl, "catalog");

				return (
					<div className="flex min-w-52 items-center gap-3">
						{imageUrl ? (
							<img
								src={imageUrl}
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
			id: "products",
			header: "Productos",
			cell: ({ row }) => {
				const products = productsByEquipmentTypeId.get(row.original.id) ?? [];

				if (products.length === 0) {
					return "Sin productos";
				}

				return (
					<div className="max-w-80">
						<p className="text-muted-foreground text-xs">
							{formatQuantity(products.length, "producto", "productos")}
						</p>
						<div className="flex flex-wrap gap-x-1">
							{products.map((product, index) => (
								<span key={product.rentableItemId}>
									<Link
										to="/dashboard/catalog/$rentableItemId"
										params={{ rentableItemId: product.rentableItemId }}
										preload={false}
										onClick={(event) => event.stopPropagation()}
										className="rounded-sm text-sm text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									>
										{product.name}
									</Link>
									{index < products.length - 1 ? "," : null}
								</span>
							))}
						</div>
					</div>
				);
			},
		},
	];
}

function formatQuantity(quantity: number, singular: string, plural: string) {
	return quantity === 1 ? `1 ${singular}` : `${quantity} ${plural}`;
}
