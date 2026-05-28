import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { RentalHeaderAuthAction } from "@/features/rental/auth/components/rental-header-auth-action";
import { CartPopover } from "@/features/rental/cart/components/cart-popover";
import { RentalFilters } from "@/features/rental/catalog/components/catalog-filters";
import {
	FeaturedBundles,
	FeaturedBundlesSkeleton,
} from "@/features/rental/catalog/components/featured-bundles";
import {
	NewArrivals,
	NewArrivalsSkeleton,
} from "@/features/rental/catalog/components/new-arrivals";
import {
	ProductCatalog,
	ProductCatalogSkeleton,
} from "@/features/rental/catalog/components/product-catalog";
import { CategoryFilter } from "@/features/rental/catalog/components/product-catalog-filters";
import { SectionErrorBoundary } from "@/features/rental/catalog/components/section-error-boundary";
import WhatsAppFloat from "@/features/rental/catalog/components/whatsapp-floating-button";
import {
	rentalPageSearchSchema,
	useRentalPageSearch,
} from "@/features/rental/catalog/hooks/use-catalog-page-search";
import { rentalTenantQueries } from "@/features/rental/tenant/tenant.queries";
import { rentalLocationQueries } from "@/features/tenant/locations/locations.queries";
import { getTenantBranding } from "@/features/tenant-branding/tenant-branding";
import { cn } from "@/lib/utils";
import { PoweredByFooter } from "@/shared/components/powered-by-footer";

export const Route = createFileRoute("/_portal/_tenant/rental/")({
	validateSearch: rentalPageSearchSchema,
	loaderDeps: ({ search }) => ({
		page: search.page,
		categoryId: search.categoryId,
		searchQuery: search.search,
		sort: search.sort,
		locationId: search.locationId,
		pickupDate: search.pickupDate,
		returnDate: search.returnDate,
	}),
	loader: async ({ context: { queryClient, tenantContext } }) => {
		await Promise.all([
			queryClient.ensureQueryData(
				rentalLocationQueries.list(tenantContext.tenant.id),
			),
			queryClient.ensureQueryData(
				rentalTenantQueries.me(tenantContext.tenant.id),
			),
		]);

		return {
			tenantName: getTenantBranding(tenantContext.tenant).tenantName,
		};
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData?.tenantName
					? `${loaderData.tenantName} | Alquiler de Equipos`
					: "Depiqo | Alquiler de Equipos",
			},
		],
		links: [
			{
				rel: "preconnect",
				href: "https://branding.depiqo.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "preconnect",
				href: "https://equipment.depiqo.com",
				crossOrigin: "anonymous",
			},
		],
	}),
	component: RentalPage,
});

function RentalPage() {
	// const { tenantContext } = Route.useRouteContext();
	// const { data: tenantRentalConfig } = useSuspenseQuery(
	// 	rentalTenantQueries.me(tenantContext.tenant.id),
	// );
	// const {
	// 	search,
	// 	setUrlParam,
	// 	handleCategorySelect,
	// 	handleLocationChange,
	// 	handleSortChange,
	// } = useRentalPageSearch();
	// const whatsAppNumber = tenantRentalConfig.communication.whatsAppNumber;
	// const shouldShowWhatsAppButton =
	// 	tenantRentalConfig.communication.showFloatingWhatsAppButton &&
	// 	Boolean(whatsAppNumber);

	return (
		<div className="flex flex-col min-h-screen bg-gray-50">
			<RentalHeader />

			{/* <main className="container mx-auto px-4">
				<RentalFilters
					search={search}
					onLocationChange={handleLocationChange}
					setUrlParam={setUrlParam}
					onCategorySelect={handleCategorySelect}
				/>

				<section className="mt-10">
					<SectionHeading
						title="Combos Destacados"
						subtitle="Combos de equipo destacados a un precio menor diario."
					/>
					<SectionErrorBoundary message="Los combos destacados no pudieron cargarse.">
						<Suspense fallback={<FeaturedBundlesSkeleton />}>
							<FeaturedBundles search={search} />
						</Suspense>
					</SectionErrorBoundary>
				</section>

				<section className="mt-12">
					<SectionHeading title="Nuevos Productos" />
					<SectionErrorBoundary message="No se pudieron cargar los nuevos productos.">
						<Suspense fallback={<NewArrivalsSkeleton />}>
							<NewArrivals locationId={search.locationId} />
						</Suspense>
					</SectionErrorBoundary>
				</section>

				<section className="mt-12">
					<SectionHeading title="Todos los Equipos" />
					<CategoryFilter
						activeCategory={search.categoryId}
						onSelect={handleCategorySelect}
					/>
					<SearchAndSortFilters
						search={search}
						onSearchCommit={(value) =>
							setUrlParam({ search: value || undefined, page: 1 })
						}
						onSortChange={handleSortChange}
					/>

					<SectionErrorBoundary message="Nuestro inventario no está disponible.">
						<Suspense fallback={<ProductCatalogSkeleton />}>
							<ProductCatalog
								search={search}
								onPageChange={(page) => setUrlParam({ page })}
							/>
						</Suspense>
					</SectionErrorBoundary>
				</section>
			</main>

			{shouldShowWhatsAppButton && whatsAppNumber ? (
				<WhatsAppFloat phoneNumber={whatsAppNumber} />
			) : null} */}

			<PoweredByFooter />
		</div>
	);
}

function SectionHeading({
	title,
	subtitle,
}: {
	title: string;
	subtitle?: string;
}) {
	return (
		<div className="pb-4">
			<h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
			{subtitle && (
				<p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
			)}
		</div>
	);
}

export function RentalHeader() {
	const { tenantContext } = Route.useRouteContext();
	const branding = getTenantBranding(tenantContext.tenant);

	return (
		<header className="sticky top-0 z-10 bg-white border-b">
			<div className="container flex items-center justify-between h-16 mx-auto px-4">
				{/* ── Logo + nav — hidden when mobile search is open ── */}
				<div className={cn("flex items-center gap-4 transition-all")}>
					{branding.logoSrc ? (
						<img
							src={branding.logoSrc}
							alt={branding.tenantName}
							className="h-10 w-auto object-contain"
						/>
					) : (
						<span className="text-xl font-bold text-primary">
							{branding.tenantName}
						</span>
					)}
					<nav className="hidden md:flex gap-4 text-sm font-medium">
						<Button variant="ghost" className="text-primary">
							Rental
						</Button>
					</nav>
				</div>

				{/* ── Right actions ── */}
				<div className="flex items-center gap-1">
					<CartPopover />
					{/* <RentalHeaderAuthAction /> */}
				</div>
			</div>
		</header>
	);
}
