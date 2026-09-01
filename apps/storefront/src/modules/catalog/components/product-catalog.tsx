import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@repo/ui/components/pagination";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import type { RentalCatalogSearch } from "@/modules/catalog/rental-catalog-search";
import type { StorefrontRentalOfferListViewItemDto } from "@/modules/catalog/rental-offers/storefront-rental-offer-list-view.schema";
import { useStorefrontCombos } from "@/modules/catalog/storefront-combos.queries";
import { useStorefrontEquipment } from "@/modules/catalog/storefront-equipment.queries";
import { useRentalOfferCartState } from "@/modules/rental-commitment/cart/add-rental-offer/use-rental-offer-cart-state";
import { usePublicTenantConfig } from "@/modules/tenant-management/tenant/tenant.queries";
import { formatCurrency } from "@/shared/utils/price.utils";
import { PackageCard } from "./package-card";
import { CategoryFilter, SearchFilter } from "./product-catalog-filters";

interface EquipmentCatalogSectionProps {
	search: RentalCatalogSearch;
	onPageChange: (page: number) => void;
	handleCategorySelect: (id: string) => void;
	setUrlParam: (patch: Partial<RentalCatalogSearch>) => void;
}

export function CombosSection({ search }: { search: RentalCatalogSearch }) {
	const combosQuery = useStorefrontCombos({
		branchId: search.branchId,
		periodStart: search.periodStart,
		periodEnd: search.periodEnd,
		pickupInstant: search.pickupInstant,
		returnInstant: search.returnInstant,
	});
	const { data: tenantPublicConfig } = usePublicTenantConfig();

	if (combosQuery.isInitialPending) {
		return <CombosSectionSkeleton />;
	}

	if (combosQuery.isInitialError || !combosQuery.data) {
		return <CombosSectionFailure onRetry={() => combosQuery.refetch()} />;
	}

	const combos = combosQuery.data;

	return (
		// biome-ignore lint/correctness/useUniqueElementIds: Stable ID required for catalog fragment navigation.
		<section id="combos" className="py-10" aria-busy={combosQuery.isFetching}>
			{combosQuery.isFailedRefresh && (
				<div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
					<p>No pudimos actualizar los combos. Mostramos los anteriores.</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => combosQuery.refetch()}
					>
						Reintentar
					</Button>
				</div>
			)}
			<div className="flex items-end justify-between gap-4">
				<div className="flex w-full items-baseline justify-between gap-4">
					<h2 className="text-2xl font-semibold tracking-tight">Combos</h2>
					<div className="text-right text-sm text-muted-foreground">
						<p>{combos.total} combos disponibles</p>
						{combosQuery.isFetching && (
							<p aria-live="polite">Actualizando combos...</p>
						)}
					</div>
				</div>
			</div>

			<p className="text-sm text-muted-foreground">
				Combos de equipo a un precio menor diario.
			</p>

			<div className="grid items-start gap-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
				{combos.data.map((rentalOffer) => (
					<PackageCard
						key={rentalOffer.id}
						product={rentalOffer}
						locale={tenantPublicConfig.locale}
						branchId={search.branchId}
						layout="compact"
					/>
				))}
			</div>
		</section>
	);
}

function CombosSectionFailure({ onRetry }: { onRetry: () => void }) {
	return (
		// biome-ignore lint/correctness/useUniqueElementIds: Stable ID required for catalog fragment navigation.
		<section id="combos" className="py-10">
			<div className="rounded-md border bg-background p-6 text-center">
				<h2 className="text-xl font-semibold">Combos</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					No pudimos cargar los combos.
				</p>
				<Button
					type="button"
					variant="outline"
					className="mt-4"
					onClick={onRetry}
				>
					Reintentar
				</Button>
			</div>
		</section>
	);
}

function CombosSectionSkeleton() {
	return (
		// biome-ignore lint/correctness/useUniqueElementIds: Stable ID required for catalog fragment navigation.
		<section id="combos" className="space-y-5 py-10" aria-busy="true">
			<div className="flex items-center justify-between gap-4">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-4 w-36" />
			</div>
			<Skeleton className="h-4 w-64 max-w-full" />
			<div className="grid items-start gap-6 py-1 sm:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }, (_, index) => `combo-skeleton-${index}`).map(
					(key) => (
						<ProductSkeleton key={key} />
					),
				)}
			</div>
		</section>
	);
}

export function EquipmentCatalogSection({
	search,
	onPageChange,
	handleCategorySelect,
	setUrlParam,
}: EquipmentCatalogSectionProps) {
	const equipmentQuery = useStorefrontEquipment(search);
	const { data: tenantPublicConfig } = usePublicTenantConfig();

	if (equipmentQuery.isInitialPending) {
		return <EquipmentCatalogSkeleton />;
	}

	if (equipmentQuery.isInitialError || !equipmentQuery.data) {
		return (
			<EquipmentCatalogFailure
				message="No pudimos cargar los equipos."
				onRetry={() => equipmentQuery.refetch()}
			/>
		);
	}

	const equipment = equipmentQuery.data;
	const totalPages = Math.ceil(equipment.total / equipment.pageSize);

	return (
		// biome-ignore lint/correctness/useUniqueElementIds: Stable ID required for catalog fragment navigation.
		<section id="equipos" className="py-10">
			{equipmentQuery.isFailedCompatibleRefresh && (
				<div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
					<p>No pudimos actualizar los resultados. Mostramos los anteriores.</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => equipmentQuery.refetch()}
					>
						Reintentar
					</Button>
				</div>
			)}
			<div className="flex items-end justify-between gap-4 pb-4">
				<div className="flex justify-between items-baseline w-full">
					<h2 className="text-2xl font-semibold tracking-tight">Equipos</h2>
					<p className="text-sm text-muted-foreground">
						{equipment.total} ofertas disponibles
					</p>
				</div>
			</div>

			<CategoryFilter
				activeCategory={search.categoryId}
				onSelect={handleCategorySelect}
			/>
			<SearchFilter
				search={search}
				onSearchCommit={(value) =>
					setUrlParam({ search: value || undefined, page: 1 })
				}
			/>

			<div className="grid gap-6 py-6 grid-cols-[repeat(auto-fit,minmax(250px,350px))]">
				{equipment.data.map((rentalOffer) => (
					<ProductCard
						key={rentalOffer.id}
						product={rentalOffer}
						locale={tenantPublicConfig.locale}
						branchId={search.branchId}
					/>
				))}
			</div>

			{totalPages > 1 && (
				<div className="mt-4 flex justify-center">
					<PaginationControls
						currentPage={search.page}
						totalPages={totalPages}
						onPageChange={onPageChange}
					/>
				</div>
			)}
		</section>
	);
}

function ProductCard({
	product,
	locale,
	branchId,
}: {
	product: StorefrontRentalOfferListViewItemDto;
	locale: string | undefined;
	branchId: string;
}) {
	const cart = useRentalOfferCartState(branchId, product);
	const unitPrice = product.pricing
		? Number(product.pricing.ratePlan.tiers[0].pricePerUnit)
		: null;
	const displayCurrency = product.pricing?.ratePlan.currency;
	const productImage = buildR2PublicUrl(product.image, "catalog");
	return (
		<Card className="overflow-hidden rounded-xs py-0 pb-6">
			<div className="aspect-4/3 bg-gray-100 relative overflow-hidden">
				{productImage ? (
					<img
						src={productImage}
						alt={product.name}
						loading="lazy"
						decoding="async"
						className="object-contain w-full h-full"
					/>
				) : (
					<div className="w-full h-full bg-muted flex items-center justify-center">
						<span className="text-sm text-muted-foreground">Sin imagen</span>
					</div>
				)}
				<Badge className="absolute top-2 right-2" variant="secondary">
					General
				</Badge>
			</div>
			<CardHeader>
				<CardTitle className="text-lg line-clamp-1">{product.name}</CardTitle>
				<p className="text-xs text-muted-foreground line-clamp-2 mt-1">
					{product.description}
				</p>
			</CardHeader>
			<CardFooter className="flex items-end justify-between gap-4">
				<div>
					{unitPrice != null && product.pricing && displayCurrency ? (
						<>
							<span className="text-lg font-bold">
								{formatCurrency(unitPrice, displayCurrency, locale ?? "es-AR")}
							</span>
							<span className="text-xs text-muted-foreground">
								{" "}
								/ {product.pricing.ratePlan.billingUnit}
							</span>
						</>
					) : (
						<span className="text-sm text-muted-foreground">Contactanos</span>
					)}
				</div>
				{cart.isInCart ? (
					<div className="flex items-center gap-1 rounded-full border bg-background p-1">
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Disminuir cantidad"
							onClick={cart.decrement}
						>
							<Minus />
						</Button>
						<span className="min-w-6 text-center text-sm font-semibold">
							{cart.quantity}
						</span>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Aumentar cantidad"
							disabled={!cart.canIncrement}
							onClick={cart.increment}
						>
							<Plus />
						</Button>
					</div>
				) : (
					<Button
						type="button"
						size="sm"
						disabled={cart.unavailable}
						onClick={cart.add}
						className="gap-2"
					>
						<ShoppingBag /> Agregar
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}

function EquipmentCatalogFailure({
	message,
	onRetry,
}: {
	message: string;
	onRetry: () => void;
}) {
	return (
		// biome-ignore lint/correctness/useUniqueElementIds: Stable ID required for catalog fragment navigation.
		<section id="equipos" className="py-10">
			<div className="rounded-md border bg-background p-6 text-center">
				<h2 className="text-xl font-semibold">Equipos</h2>
				<p className="mt-2 text-sm text-muted-foreground">{message}</p>
				<Button
					type="button"
					variant="outline"
					className="mt-4"
					onClick={onRetry}
				>
					Reintentar
				</Button>
			</div>
		</section>
	);
}

function EquipmentCatalogSkeleton() {
	return (
		// biome-ignore lint/correctness/useUniqueElementIds: Stable ID required for catalog fragment navigation.
		<section id="equipos" className="space-y-5 py-10" aria-busy="true">
			<div className="flex items-center justify-between gap-4">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-4 w-36" />
			</div>
			<div className="space-y-3">
				<div className="flex gap-2">
					<Skeleton className="h-8 w-24" />
					<Skeleton className="h-8 w-28" />
					<Skeleton className="h-8 w-20" />
				</div>
				<Skeleton className="h-10 w-full max-w-md" />
			</div>
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{Array.from(
					{ length: 8 },
					(_, index) => `equipment-skeleton-${index}`,
				).map((key) => (
					<ProductSkeleton key={key} />
				))}
			</div>
		</section>
	);
}

export function ProductCatalogSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 py-10">
			{Array.from({ length: 8 }, (_, index) => `product-skeleton-${index}`).map(
				(key) => (
					<ProductSkeleton key={key} />
				),
			)}
		</div>
	);
}

function ProductSkeleton() {
	return (
		<Card className="overflow-hidden">
			<Skeleton className="aspect-4/3" />
			<CardHeader className="p-4 pb-0">
				<Skeleton className="h-4 w-3/4 mb-2" />
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-3 w-2/3 mt-1" />
			</CardHeader>
			<CardFooter className="p-4 flex items-center justify-between">
				<Skeleton className="h-5 w-16" />
				<Skeleton className="h-8 w-16" />
			</CardFooter>
		</Card>
	);
}

function buildPageWindow(
	current: number,
	total: number,
): (number | "ellipsis")[] {
	if (total <= 1) return [];

	const pages = new Set<number>();
	pages.add(1);
	pages.add(total);
	for (let d = -1; d <= 1; d++) {
		const p = current + d;
		if (p >= 1 && p <= total) pages.add(p);
	}

	const sorted = [...pages].sort((a, b) => a - b);
	const result: (number | "ellipsis")[] = [];

	for (let i = 0; i < sorted.length; i++) {
		result.push(sorted[i]);
		if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) {
			result.push("ellipsis");
		}
	}

	return result;
}

function PaginationControls({
	currentPage,
	totalPages,
	onPageChange,
}: {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}) {
	const pageWindow = buildPageWindow(currentPage, totalPages);

	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						onClick={() => onPageChange(Math.max(1, currentPage - 1))}
						className={
							currentPage === 1
								? "pointer-events-none opacity-50"
								: "cursor-pointer"
						}
					/>
				</PaginationItem>

				{pageWindow.map((entry, i) =>
					entry === "ellipsis" ? (
						<PaginationItem
							key={`ellipsis-${pageWindow[i - 1]}-${pageWindow[i + 1]}`}
						>
							<PaginationEllipsis />
						</PaginationItem>
					) : (
						<PaginationItem key={entry}>
							<PaginationLink
								isActive={entry === currentPage}
								onClick={() => onPageChange(entry)}
								className="cursor-pointer"
							>
								{entry}
							</PaginationLink>
						</PaginationItem>
					),
				)}

				<PaginationItem>
					<PaginationNext
						onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
						className={
							currentPage === totalPages
								? "pointer-events-none opacity-50"
								: "cursor-pointer"
						}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
