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
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
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
					No pudimos cargar los productos.
				</p>
				<Button variant="outline" onClick={() => query.refetch()}>
					Reintentar
				</Button>
			</div>
		);
	if (!data) return null;
	return (
		<section className="@container/equipment-rentals space-y-8">
			{query.isFetching ? (
				<div className="flex justify-end">
					<span className="flex items-center gap-1.5 text-muted-foreground text-xs">
						<Loader2 className="size-3 animate-spin" />
						Actualizando...
					</span>
				</div>
			) : null}
			{query.isError ? (
				<div
					role="alert"
					className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm"
				>
					<span>No pudimos actualizar los productos.</span>
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

function SectionHeader({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<h2 className="font-semibold text-lg">{title}</h2>
				<p className="mt-1 text-muted-foreground text-sm">{description}</p>
			</div>
			{action}
		</div>
	);
}

function IndividualRentalsSection({
	equipmentTypeId,
	items,
}: {
	equipmentTypeId: string;
	items: IndividualRentalUsageDto[];
}) {
	return (
		<section className="space-y-4">
			<SectionHeader
				title="Alquileres individuales"
				description="Presentaciones, precios y disponibilidad comercial por sucursal."
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
			{items.length ? (
				<div className="space-y-4">
					{items.map((item) => (
						<IndividualRentalItem key={item.rentableItemId} item={item} />
					))}
				</div>
			) : (
				<EmptyState message="Este equipo todavía no tiene un alquiler individual configurado." />
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
	const startingPrice = item.startingPrice
		? formatStartingPrice(item.startingPrice)
		: hasMissingPricing
			? "Sin precio configurado"
			: "Sin resumen de precio";

	return (
		<article className="overflow-hidden rounded-lg border bg-background shadow-xs">
			<header className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
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
						<div className="flex flex-wrap items-center gap-2">
							<h3 className="font-semibold">{item.name}</h3>
							<ProductStatusBadge status={item.status} />
						</div>
						<p className="mt-1 text-muted-foreground text-sm">
							{item.categoryName ?? "Sin categoría"}
						</p>
						<p className="mt-3 text-muted-foreground text-xs">Precio inicial</p>
						<p className="font-semibold text-sm">{startingPrice}</p>
					</div>
				</div>
				<RentalActions
					item={item}
					onManage={() => setManageOpen(true)}
					onArchive={() => setArchiveOpen(true)}
				/>
			</header>

			<div className="border-t bg-muted/20 px-4 py-3">
				<p className="mb-2 font-medium text-sm">Sucursales comerciales</p>
				{item.offers.length ? (
					<div className="divide-y rounded-md border bg-background">
						{item.offers.map((offer) => (
							<div
								key={offer.rentalOfferId}
								className="grid gap-3 px-3 py-2.5 @lg/equipment-rentals:grid-cols-[minmax(140px,1fr)_auto_auto_minmax(140px,auto)] @lg/equipment-rentals:items-center"
							>
								<p className="font-medium text-sm">
									{offer.branchName ?? offer.branchId}
								</p>
								<Badge variant={offer.isVisible ? "secondary" : "outline"}>
									{offer.isVisible ? "Visible" : "Oculta"}
								</Badge>
								<Badge variant={offer.isRentable ? "secondary" : "outline"}>
									{offer.isRentable
										? "Disponible para alquilar"
										: "No alquilable"}
								</Badge>
								<div className="flex items-center justify-between gap-3 @lg/equipment-rentals:justify-end">
									<span className="text-muted-foreground text-xs">
										{offer.pricing.startingPrice
											? formatStartingPrice(offer.pricing.startingPrice)
											: "Sin precio configurado"}
									</span>
									<RentalOfferPriceAction
										rentableItemId={item.rentableItemId}
										offer={offer}
									/>
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						Sin sucursales configuradas.
					</p>
				)}
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

function RentalActions({
	item,
	onManage,
	onArchive,
}: {
	item: IndividualRentalUsageDto;
	onManage: () => void;
	onArchive: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="icon">
						<MoreHorizontal className="size-4" />
						<span className="sr-only">Acciones</span>
					</Button>
				}
			/>
			<DropdownMenuContent align="end" className="min-w-52">
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
				<DropdownMenuItem onClick={onManage}>
					Gestionar sucursales
				</DropdownMenuItem>
				{item.status !== "ARCHIVED" ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive" onClick={onArchive}>
							<Archive className="size-4" />
							Archivar
						</DropdownMenuItem>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
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
		<section className="space-y-4 border-t pt-8">
			<SectionHeader
				title="Combos"
				description="Combos que requieren este equipo."
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
						<Plus className="mr-2 size-4" />
						Crear combo con este equipo
					</Button>
				}
			/>
			{items.length ? (
				<ComboTable items={items} />
			) : (
				<EmptyState message="Este equipo todavía no forma parte de ningún combo." />
			)}
		</section>
	);
}

function ComboTable({ items }: { items: ComboRentalUsageDto[] }) {
	return (
		<div className="overflow-hidden rounded-lg border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Combo</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Cantidad</TableHead>
						<TableHead className="text-right">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map((item) => (
						<ComboUsageRow key={item.rentableItemId} item={item} />
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function ComboUsageRow({ item }: { item: ComboRentalUsageDto }) {
	const imageUrl = buildR2PublicUrl(item.imageUrl, "catalog");
	return (
		<TableRow>
			<TableCell>
				<div className="flex min-w-52 items-center gap-3">
					{imageUrl ? (
						<img
							src={imageUrl}
							alt={item.name}
							className="size-10 rounded-md border object-cover"
						/>
					) : (
						<div className="flex size-10 items-center justify-center rounded-md border bg-muted">
							<Boxes className="size-4 text-muted-foreground" />
						</div>
					)}
					<div>
						<p className="font-medium">{item.name}</p>
						<p className="text-muted-foreground text-xs">
							{item.categoryName ?? "Sin categoría"}
						</p>
					</div>
				</div>
			</TableCell>
			<TableCell>
				<ProductStatusBadge status={item.status} />
			</TableCell>
			<TableCell className="whitespace-nowrap font-medium text-sm">
				{item.requirementQuantity}{" "}
				{item.requirementQuantity === 1 ? "unidad" : "unidades"}
			</TableCell>
			<TableCell>
				<div className="flex justify-end gap-2 whitespace-nowrap">
					<Button
						nativeButton={false}
						variant="ghost"
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
			</TableCell>
		</TableRow>
	);
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
			<p>{message}</p>
		</div>
	);
}

function RentalSectionSkeleton() {
	return (
		<div className="space-y-8">
			{["individuals", "combos"].map((section) => (
				<div key={section} className="space-y-4">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-40 w-full" />
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
