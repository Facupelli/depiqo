import type {
	ComboRentalUsageDto,
	EquipmentTypeRentalUsageStartingPriceDto,
	IndividualRentalUsageDto,
} from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import {
	Archive,
	Boxes,
	Loader2,
	MoreHorizontal,
	Pencil,
	Plus,
} from "lucide-react";
import { useState } from "react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { ArchiveProductAction } from "@/modules/products/archive-product/ArchiveProductAction";
import { ProductStatusBadge } from "@/modules/products/product-status-badge";
import { formatMoney } from "@/shared/utils/formatters";
import { useEquipmentTypeRentalUsages } from "./equipment-type-rental-usages.queries";
import { ManageRentalBranchesDialog } from "./manage-rental-branches-dialog";
import { RentalOfferPriceAction } from "./rental-offer-price-action";

export function EquipmentRentalsSection({
	equipmentTypeId,
}: {
	equipmentTypeId: string;
}) {
	const query = useEquipmentTypeRentalUsages(equipmentTypeId);
	const data = query.data;
	if (query.isPending && !data) return <RentalSectionSkeleton />;
	if (query.isError && !data)
		return (
			<div className="rounded-lg border px-4 py-12 text-center">
				<p className="mb-4 text-destructive text-sm">
					No pudimos cargar los alquileres.
				</p>
				<Button variant="outline" onClick={() => query.refetch()}>
					Reintentar
				</Button>
			</div>
		);
	if (!data) return null;
	return (
		<section className="@container/equipment-rentals space-y-6">
			<div className="flex min-h-5 justify-end">
				{query.isFetching ? (
					<span className="flex items-center gap-1.5 text-muted-foreground text-xs">
						<Loader2 className="size-3 animate-spin" />
						Actualizando...
					</span>
				) : null}
			</div>
			{query.isError ? (
				<div
					role="alert"
					className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm"
				>
					<span>No pudimos actualizar los alquileres.</span>
					<Button variant="ghost" size="sm" onClick={() => query.refetch()}>
						Reintentar
					</Button>
				</div>
			) : null}
			<IndividualRentalsSection
				equipmentTypeId={equipmentTypeId}
				items={data.individuals}
			/>
			<ComboUsagesSection
				equipmentTypeId={equipmentTypeId}
				items={data.combos}
			/>
		</section>
	);
}

function IndividualRentalsSection({
	items,
}: {
	equipmentTypeId: string;
	items: IndividualRentalUsageDto[];
}) {
	return (
		<section className="space-y-3">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 className="font-semibold text-lg">Alquileres individuales</h2>
					<p className="text-muted-foreground text-sm">
						Presentación, precio y ofertas comerciales por sucursal.
					</p>
				</div>
				<Button
					nativeButton={false}
					render={
						<Link
							to="/dashboard/inventory/equipment-types/$equipmentTypeId/rentals/new"
							params={{ equipmentTypeId }}
						/>
					}
				>
					<Plus className="mr-2 size-4" />
					Nuevo alquiler individual
				</Button>
			</div>
			{items.length ? (
				<div className="space-y-3">
					{items.map((item) => (
						<IndividualRentalItem key={item.rentableItemId} item={item} />
					))}
				</div>
			) : (
				<EmptyState
					message="Este equipo todavía no tiene un alquiler individual configurado."
					action={
						<Button
							nativeButton={false}
							render={
								<Link
									to="/dashboard/inventory/equipment-types/$equipmentTypeId/rentals/new"
									params={{ equipmentTypeId }}
								/>
							}
						>
							<Plus className="mr-2 size-4" />
							Nuevo alquiler individual
						</Button>
					}
				/>
			)}
		</section>
	);
}

function IndividualRentalItem({ item }: { item: IndividualRentalUsageDto }) {
	const [manageOpen, setManageOpen] = useState(false);
	const [archiveOpen, setArchiveOpen] = useState(false);
	const imageUrl = buildR2PublicUrl(item.imageUrl, "catalog");
	const hasMissingPricing = item.offers.some(
		(offer) => !offer.pricing.configured,
	);
	return (
		<article className="overflow-hidden rounded-lg border bg-background shadow-xs">
			<div className="grid gap-4 p-4 @2xl/equipment-rentals:grid-cols-[minmax(220px,1.2fr)_minmax(150px,.65fr)_minmax(320px,1.6fr)_auto] @2xl/equipment-rentals:items-start">
				<div className="flex min-w-0 gap-3">
					{imageUrl ? (
						<img
							src={imageUrl}
							alt={item.name}
							className="size-14 shrink-0 rounded-lg border object-cover"
						/>
					) : (
						<div className="flex size-14 shrink-0 items-center justify-center rounded-lg border bg-muted">
							<Boxes className="size-5 text-muted-foreground" />
						</div>
					)}
					<div className="min-w-0">
						<p className="font-semibold">{item.name}</p>
						<p className="text-muted-foreground text-sm">
							{item.categoryName ?? "Sin categoría"}
						</p>
						<div className="mt-2">
							<ProductStatusBadge status={item.status} />
						</div>
					</div>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Precio inicial</p>
					<p className="mt-1 font-semibold">
						{item.startingPrice
							? formatStartingPrice(item.startingPrice)
							: hasMissingPricing
								? "Sin precio configurado"
								: "Sin resumen de precio"}
					</p>
				</div>
				<div className="space-y-2">
					{item.offers.length ? (
						item.offers.map((offer) => (
							<div
								key={offer.rentalOfferId}
								className="grid gap-2 rounded-md border p-3 @md/equipment-rentals:grid-cols-[minmax(130px,1fr)_auto] @md/equipment-rentals:items-center"
							>
								<div>
									<p className="font-medium text-sm">
										{offer.branchName ?? offer.branchId}
									</p>
									<div className="mt-1 flex flex-wrap gap-1.5">
										<Badge variant={offer.isVisible ? "secondary" : "outline"}>
											{offer.isVisible ? "Visible en el catálogo" : "Oculta"}
										</Badge>
										<Badge variant={offer.isRentable ? "secondary" : "outline"}>
											{offer.isRentable
												? "Disponible para alquilar"
												: "No disponible para alquilar"}
										</Badge>
									</div>
									<p className="mt-2 text-muted-foreground text-xs">
										{offer.pricing.startingPrice
											? formatStartingPrice(offer.pricing.startingPrice)
											: "Sin precio configurado"}
									</p>
								</div>
								<RentalOfferPriceAction
									rentableItemId={item.rentableItemId}
									offer={offer}
								/>
							</div>
						))
					) : (
						<p className="text-muted-foreground text-sm">
							Sin ofertas por sucursal.
						</p>
					)}
				</div>
				<div className="flex justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button variant="ghost" size="icon">
									<MoreHorizontal className="size-4" />
									<span className="sr-only">Acciones</span>
								</Button>
							}
						/>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								render={
									<Link
										to="/dashboard/catalog/$rentableItemId/edit"
										params={{ rentableItemId: item.rentableItemId }}
									/>
								}
							>
								<Pencil className="size-4" />
								Editar alquiler
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setManageOpen(true)}>
								Gestionar sucursales
							</DropdownMenuItem>
							{item.status !== "ARCHIVED" ? (
								<DropdownMenuItem
									variant="destructive"
									onClick={() => setArchiveOpen(true)}
								>
									<Archive className="size-4" />
									Archivar
								</DropdownMenuItem>
							) : null}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			<ManageRentalBranchesDialog
				rental={item}
				open={manageOpen}
				onOpenChange={setManageOpen}
			/>
			{item.status !== "ARCHIVED" ? (
				<ArchiveProductAction
					rentableItemId={item.rentableItemId}
					open={archiveOpen}
					onOpenChange={setArchiveOpen}
				/>
			) : null}
		</article>
	);
}

function ComboUsagesSection({
	equipmentTypeId,
	items,
}: {
	equipmentTypeId: string;
	items: ComboRentalUsageDto[];
}) {
	return (
		<section className="space-y-3">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 className="font-semibold text-lg">Combos</h2>
					<p className="text-muted-foreground text-sm">
						Combos que requieren este equipo.
					</p>
				</div>
				<Button
					nativeButton={false}
					render={
						<Link
							to="/dashboard/catalog/packages/new"
							search={{ equipmentTypeId }}
						/>
					}
				>
					<Plus className="mr-2 size-4" />
					Crear combo con este equipo
				</Button>
			</div>
			{items.length ? (
				<div className="divide-y rounded-lg border">
					{items.map((item) => (
						<ComboUsageItem key={item.rentableItemId} item={item} />
					))}
				</div>
			) : (
				<EmptyState
					message="Este equipo todavía no forma parte de ningún combo."
					action={
						<Button
							nativeButton={false}
							render={
								<Link
									to="/dashboard/catalog/packages/new"
									search={{ equipmentTypeId }}
								/>
							}
						>
							Crear combo con este equipo
						</Button>
					}
				/>
			)}
		</section>
	);
}
function ComboUsageItem({ item }: { item: ComboRentalUsageDto }) {
	const imageUrl = buildR2PublicUrl(item.imageUrl, "catalog");
	return (
		<article className="flex flex-col gap-3 p-4 @md/equipment-rentals:flex-row @md/equipment-rentals:items-center">
			<div className="flex min-w-0 flex-1 gap-3">
				{imageUrl ? (
					<img
						src={imageUrl}
						alt={item.name}
						className="size-12 rounded-lg border object-cover"
					/>
				) : (
					<div className="flex size-12 items-center justify-center rounded-lg border bg-muted">
						<Boxes className="size-5" />
					</div>
				)}
				<div>
					<p className="font-medium">{item.name}</p>
					<p className="text-muted-foreground text-xs">
						{item.categoryName ?? "Sin categoría"}
					</p>
					<div className="mt-1">
						<ProductStatusBadge status={item.status} />
					</div>
				</div>
			</div>
			<p className="font-medium text-sm">
				Usa {item.requirementQuantity}{" "}
				{item.requirementQuantity === 1 ? "unidad" : "unidades"} de este equipo
			</p>
			<div className="flex gap-2">
				<Button
					nativeButton={false}
					variant="outline"
					size="sm"
					render={
						<Link
							to="/dashboard/catalog/packages/$rentableItemId"
							params={{ rentableItemId: item.rentableItemId }}
						/>
					}
				>
					Ver combo
				</Button>
				<Button
					nativeButton={false}
					variant="outline"
					size="sm"
					render={
						<Link
							to="/dashboard/catalog/packages/$rentableItemId/edit"
							params={{ rentableItemId: item.rentableItemId }}
						/>
					}
				>
					Editar combo
				</Button>
			</div>
		</article>
	);
}
function EmptyState({
	message,
	action,
}: {
	message: string;
	action: React.ReactNode;
}) {
	return (
		<div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
			<p>{message}</p>
			{action}
		</div>
	);
}
function RentalSectionSkeleton() {
	return (
		<div className="space-y-6">
			{["individuals", "combos"].map((section) => (
				<div key={section} className="space-y-3">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-36 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			))}
		</div>
	);
}
const billingUnitLabels = { HOUR: "hora", DAY: "día", WEEK: "semana" } as const;
function formatStartingPrice(price: EquipmentTypeRentalUsageStartingPriceDto) {
	const amount = Number(price.amount);
	const money = Number.isFinite(amount)
		? formatMoney(price.amount, price.currency)
		: `${price.currency} ${price.amount}`;
	return `Desde ${money}/${billingUnitLabels[price.billingUnit]}`;
}
