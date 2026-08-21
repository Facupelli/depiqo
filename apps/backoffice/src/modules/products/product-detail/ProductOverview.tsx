import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import {
	Building2,
	CircleDollarSign,
	Ellipsis,
	PackageOpen,
	Pencil,
	Plus,
	Wrench,
} from "lucide-react";
import { ActivateProductAction } from "@/modules/products/activate-product/ActivateProductAction";
import { AddBranchAvailabilityDialog } from "@/modules/products/branch-availability/add-branch-availability/AddBranchAvailabilityDialog";
import type { PricePlanOption } from "@/modules/products/product-pricing/price-plan-selection/PricePlanSelectionForm";
import { getKindLabel } from "./product-detail.utils";

interface ProductOverviewProps {
	product: GetRentableItemDetailResponseDto;
	imageUrl: string | null;
	startingPrice: string | null;
	physicalStockCapacity: number;
	ratePlanOptions: PricePlanOption[];
}

const statusPresentation = {
	DRAFT: {
		label: "Borrador",
		variant: "secondary",
		className: "",
	},
	ACTIVE: {
		label: "Activo",
		variant: "default",
		className: "bg-emerald-600 text-white",
	},
	ARCHIVED: {
		label: "Archivado",
		variant: "outline",
		className: "",
	},
} satisfies Record<
	GetRentableItemDetailResponseDto["status"],
	{
		label: string;
		variant: "default" | "secondary" | "outline";
		className: string;
	}
>;

export function ProductOverview({
	product,
	imageUrl,
	startingPrice,
	physicalStockCapacity,
	ratePlanOptions,
}: ProductOverviewProps) {
	return (
		<Card className="overflow-hidden rounded-2xl py-0 shadow-sm">
			<CardContent className="grid p-0 lg:grid-cols-[300px_minmax(0,1fr)]">
				<div className="flex min-h-56 items-center justify-center border-b bg-muted/20 p-6 lg:min-h-72 lg:border-r lg:border-b-0">
					{imageUrl ? (
						<img
							src={imageUrl}
							alt={product.name}
							className="max-h-48 max-w-55 object-contain"
						/>
					) : (
						<PackageOpen className="size-12 text-muted-foreground" />
					)}
				</div>

				<div className="flex min-w-0 flex-col p-5 lg:p-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0">
							<h1 className="truncate text-3xl font-semibold tracking-tight">
								{product.name}
							</h1>
							<p className="mt-1 text-muted-foreground text-sm">
								{product.categoryName ?? "Sin categoría"} ·{" "}
								{getKindLabel(product.kind)}
							</p>
							<ProductStatus status={product.status} />
						</div>
						<ProductActions
							product={product}
							ratePlanOptions={ratePlanOptions}
						/>
					</div>

					<div className="mt-8 grid grid-cols-2 divide-x divide-y border sm:grid-cols-4 sm:divide-y-0">
						<OverviewMetric
							icon={Building2}
							label="Sucursales"
							value={String(product.offers.length)}
						/>
						<OverviewMetric
							icon={CircleDollarSign}
							label="Precio"
							value={startingPrice ?? "Sin configurar"}
						/>
						<OverviewMetric
							icon={Wrench}
							label="Equipo requerido"
							value={String(product.requiredEquipment.length)}
						/>
						<OverviewMetric
							icon={PackageOpen}
							label="Capacidad de alquiler"
							value={String(physicalStockCapacity)}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function ProductActions({
	product,
	ratePlanOptions,
}: {
	product: GetRentableItemDetailResponseDto;
	ratePlanOptions: PricePlanOption[];
}) {
	return (
		<div className="flex shrink-0 items-center gap-2">
			{product.status === "DRAFT" ? (
				<ActivateProductAction product={product} />
			) : null}
			<Button
				size="lg"
				render={
					<Link
						to="/dashboard/catalog/$rentableItemId/edit"
						params={{ rentableItemId: product.id }}
					/>
				}
			>
				<Pencil className="mr-2 size-4" />
				Editar producto
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="outline"
							size="icon"
							aria-label="Abrir acciones del producto"
						>
							<Ellipsis className="size-4" />
						</Button>
					}
				/>
				<DropdownMenuContent align="end" className="min-w-fit">
					<AddBranchAvailabilityDialog
						item={product}
						ratePlanOptions={ratePlanOptions}
						trigger={
							<DropdownMenuItem>
								<Plus className="size-4" />
								Ofrecer en otra sucursal
							</DropdownMenuItem>
						}
					/>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function ProductStatus({
	status,
}: {
	status: GetRentableItemDetailResponseDto["status"];
}) {
	const presentation = statusPresentation[status];
	return (
		<Badge
			variant={presentation.variant}
			className={`mt-3 ${presentation.className}`}
		>
			{presentation.label}
		</Badge>
	);
}

function OverviewMetric({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Building2;
	label: string;
	value: string;
}) {
	return (
		<div className="min-w-0 p-4 first:border-l-0 sm:p-5">
			<div className="flex items-center gap-2 text-muted-foreground">
				<Icon className="size-4" />
				<span className="truncate text-xs font-medium">{label}</span>
			</div>
			<p className="mt-3 truncate font-semibold text-sm" title={value}>
				{value}
			</p>
		</div>
	);
}
