import { Badge } from "@repo/ui/components/badge";
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
import type { StorefrontRentalOfferListViewItemDto } from "@/modules/catalog/rental-offers/get-storefront-rental-offer-list-view/get-storefront-rental-offer-list-view.schema";
import type { RentalCatalogSearch } from "@/modules/catalog/rental-catalog-search";
import { useStorefrontRentalOfferListView } from "@/modules/catalog/storefront-rental-offer-list-view.queries";
import { usePublicTenantConfig } from "@/modules/tenant-management/tenant/tenant.queries";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { formatCurrency } from "@/shared/utils/price.utils";
import { CategoryFilter, SearchFilter } from "./product-catalog-filters";

interface ProductCatalogProps {
	search: RentalCatalogSearch;
	onPageChange: (page: number) => void;
	handleCategorySelect: (id: string) => void;
	setUrlParam: (patch: Partial<RentalCatalogSearch>) => void;
}

export function ProductCatalog({
	search,
	onPageChange,
	handleCategorySelect,
	setUrlParam,
}: ProductCatalogProps) {
	const { data: rentalOffers, isFetching } =
		useStorefrontRentalOfferListView(search);
	const { data: tenantPublicConfig } = usePublicTenantConfig();

	const totalPages = Math.ceil(
		rentalOffers.singles.total / rentalOffers.singles.pageSize,
	);

	return (
		<>
			{isFetching && (
				<p className="pt-4 text-sm text-muted-foreground">
					Actualizando resultados...
				</p>
			)}

			<section className="py-10">
				<div className="flex items-end justify-between gap-4">
					<div className="flex justify-between items-baseline w-full">
						<h2 className="text-2xl font-semibold tracking-tight">Combos</h2>
						<p className="text-sm text-muted-foreground">
							{rentalOffers.packages.total} ofertas disponibles
						</p>
					</div>
				</div>
				<p className="text-sm text-muted-foreground">
					Combos de equipo destacados a un precio menor diario.
				</p>
				<div className="grid gap-6 py-6 grid-cols-[repeat(auto-fit,minmax(250px,350px))]">
					{rentalOffers.packages.data.map((rentalOffer) => (
						<ProductCard
							key={rentalOffer.id}
							product={rentalOffer}
							locale={tenantPublicConfig.locale}
						/>
					))}
				</div>
			</section>

			<section className="py-10">
				<div className="flex items-end justify-between gap-4 pb-4">
					<div className="flex justify-between items-baseline w-full">
						<h2 className="text-2xl font-semibold tracking-tight">Equipos</h2>
						<p className="text-sm text-muted-foreground">
							{rentalOffers.singles.total} ofertas disponibles
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
					{rentalOffers.singles.data.map((rentalOffer) => (
						<ProductCard
							key={rentalOffer.id}
							product={rentalOffer}
							locale={tenantPublicConfig.locale}
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
		</>
	);
}

function ProductCard({
	product,
	locale,
}: {
	product: StorefrontRentalOfferListViewItemDto;
	locale: string | undefined;
}) {
	const unitPrice = product.pricing
		? Number(product.pricing.ratePlan.tiers[0].pricePerUnit)
		: null;
	const displayCurrency = product.pricing?.ratePlan.currency;
	const productImage = buildR2PublicUrl(product.image, "catalog");
	const availabilityLabel =
		product.availableCount === null
			? null
			: product.availableCount > 0
				? `${product.availableCount} disponibles`
				: "No disponible para este periodo";

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
				{availabilityLabel && (
					<p className="max-w-36 text-right text-xs text-muted-foreground">
						{availabilityLabel}
					</p>
				)}
			</CardFooter>
		</Card>
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
