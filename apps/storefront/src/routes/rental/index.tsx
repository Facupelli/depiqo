import { Skeleton } from "@repo/ui/components/skeleton";
import {
	createFileRoute,
	notFound,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { Suspense } from "react";
import { RentalFilters } from "@/modules/catalog/components/catalog-filters";
import {
	NewArrivals,
	NewArrivalsSkeleton,
} from "@/modules/catalog/components/new-arrivals";
import {
	CombosSection,
	EquipmentCatalogSection,
	ProductCatalogSkeleton,
} from "@/modules/catalog/components/product-catalog";
import {
	BranchSelection,
	CatalogUnavailable,
} from "@/modules/catalog/components/rental-catalog-entry-state";
import { SectionErrorBoundary } from "@/modules/catalog/components/section-error-boundary";
import { useRentalPageSearch } from "@/modules/catalog/hooks/use-catalog-page-search";
import { newArrivalsQueries } from "@/modules/catalog/new-arrivals/new-arrivals.queries";
import { resolveRentalBranch } from "@/modules/catalog/rental-branch-resolution";
import {
	type RentalCatalogSearch,
	rentalCatalogSearchDefaults,
	rentalCatalogSearchSchema,
} from "@/modules/catalog/rental-catalog-search";
import { storefrontCombosQueries } from "@/modules/catalog/storefront-combos.queries";
import { storefrontEquipmentQueries } from "@/modules/catalog/storefront-equipment.queries";
import { CartPopover } from "@/modules/rental-commitment/cart/view-cart/cart-popover";
import { CustomerAccountAction } from "@/modules/tenant-management/auth/components/customer-account-action";
import { storefrontBranchQueries } from "@/modules/tenant-management/branches/branches.queries";
import { FloatingWhatsAppButton } from "@/modules/tenant-management/components/floating-whatsapp-button";
import { publicTenantConfigQueries } from "@/modules/tenant-management/tenant/tenant.queries";
import { getTenantBranding } from "@/modules/tenant-management/tenant-branding/tenant-branding";

export const Route = createFileRoute("/rental/")({
	validateSearch: rentalCatalogSearchSchema,
	search: {
		middlewares: [stripSearchParams(rentalCatalogSearchDefaults)],
	},
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient, tenantContext }, deps, cause }) => {
		if (!tenantContext || tenantContext.face !== "storefront") {
			throw notFound();
		}

		const [branches, tenantConfig] = await Promise.all([
			queryClient.ensureQueryData(storefrontBranchQueries.list()),
			queryClient.ensureQueryData(publicTenantConfigQueries.detail()),
		]);
		const resolution = resolveRentalBranch(deps.branchId, branches);
		const branding = getTenantBranding(tenantContext.tenant);

		if (resolution.kind === "catalog") {
			if (cause === "enter" || cause === "preload") {
				const search: RentalCatalogSearch = {
					...deps,
					branchId: resolution.branchId,
				};
				await Promise.all([
					queryClient.prefetchQuery(
						storefrontCombosQueries.list({
							branchId: search.branchId,
							periodStart: search.periodStart,
							periodEnd: search.periodEnd,
						}),
					),
					queryClient.prefetchQuery(storefrontEquipmentQueries.list(search)),
					queryClient.prefetchQuery(
						newArrivalsQueries.detail({
							branchId: resolution.branchId,
							windowDays: tenantConfig.newArrivalsWindowDays,
						}),
					),
				]);
			}
			return {
				mode: "catalog" as const,
				branchId: resolution.branchId,
				branding,
			};
		}

		if (resolution.kind === "selection") {
			return {
				mode: "selection" as const,
				branches,
				invalidBranchRequested: resolution.invalidBranchRequested,
				branding,
			};
		}

		return { mode: "no-branches" as const, branding };
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData?.branding.tenantName
					? `${loaderData.branding.tenantName} | Alquiler de Equipos`
					: "Depiqo | Alquiler de Equipos",
			},
		],
		links: loaderData?.branding.faviconHref
			? [{ rel: "icon", href: loaderData.branding.faviconHref }]
			: [{ rel: "icon", href: "/favicon.svg" }],
	}),
	pendingComponent: RentalPageSkeleton,
	component: RentalPage,
});

function RentalPageSkeleton() {
	return (
		<div className="min-h-screen bg-gray-50" aria-hidden="true">
			<header className="border-b bg-white">
				<div className="container mx-auto flex h-16 items-center justify-between px-4">
					<Skeleton className="h-10 w-36" />
					<div className="flex items-center gap-3">
						<Skeleton className="size-9 rounded-full" />
						<Skeleton className="size-9 rounded-full" />
					</div>
				</div>
			</header>
			<main className="container mx-auto space-y-10 px-4 py-6">
				<section className="space-y-4">
					<div className="grid gap-4 md:grid-cols-3">
						<Skeleton className="h-10" />
						<Skeleton className="h-10" />
						<Skeleton className="h-10" />
					</div>
					<div className="flex gap-4">
						<Skeleton className="h-5 w-16" />
						<Skeleton className="h-5 w-20" />
						<Skeleton className="h-5 w-20" />
					</div>
				</section>
				<RentalSectionSkeleton cardCount={4} />
				<section className="space-y-4">
					<Skeleton className="h-7 w-48" />
					<div className="flex gap-5 overflow-hidden">
						{Array.from({ length: 5 }, (_, index) => `arrival-${index}`).map(
							(key) => (
								<div key={key} className="w-44 shrink-0 space-y-3">
									<Skeleton className="aspect-square" />
									<Skeleton className="h-4 w-4/5" />
									<Skeleton className="h-4 w-1/2" />
								</div>
							),
						)}
					</div>
				</section>
				<RentalSectionSkeleton cardCount={8} showFilters />
			</main>
		</div>
	);
}

function RentalSectionSkeleton({
	cardCount,
	showFilters = false,
}: {
	cardCount: number;
	showFilters?: boolean;
}) {
	return (
		<section className="space-y-5">
			<div className="flex items-center justify-between gap-4">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-4 w-36" />
			</div>
			{showFilters && (
				<div className="space-y-3">
					<div className="flex gap-2">
						<Skeleton className="h-8 w-24" />
						<Skeleton className="h-8 w-28" />
						<Skeleton className="h-8 w-20" />
					</div>
					<Skeleton className="h-10 w-full max-w-md" />
				</div>
			)}
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{Array.from(
					{ length: cardCount },
					(_, index) => `catalog-card-${index}`,
				).map((key) => (
					<div key={key} className="space-y-3">
						<Skeleton className="aspect-4/3" />
						<Skeleton className="h-5 w-3/4" />
						<Skeleton className="h-4 w-full" />
					</div>
				))}
			</div>
		</section>
	);
}

function RentalPage() {
	const loaderData = Route.useLoaderData();
	const routeSearch = Route.useSearch();
	const navigate = useNavigate({ from: "/rental/" });
	const catalogSearch: RentalCatalogSearch | null =
		loaderData.mode === "catalog"
			? { ...routeSearch, branchId: loaderData.branchId }
			: null;
	const handleBranchSelect = (branchId: string) =>
		navigate({
			search: (previous) => ({ ...previous, branchId, page: 1 }),
			replace: true,
		});

	return (
		<div className="flex min-h-screen flex-col bg-gray-50">
			<header className="sticky top-0 z-10 border-b bg-white">
				<div className="container mx-auto flex h-16 items-center gap-4 px-4">
					{loaderData.branding.logoSrc ? (
						<img
							src={loaderData.branding.logoSrc}
							alt={loaderData.branding.tenantName}
							className="h-10 w-auto object-contain"
						/>
					) : (
						<span className="text-xl font-bold text-primary">
							{loaderData.branding.tenantName}
						</span>
					)}
					<div className="ml-auto flex items-center gap-3">
						{catalogSearch && <CartPopover search={catalogSearch} />}
						<CustomerAccountAction />
					</div>
				</div>
			</header>
			{catalogSearch ? (
				<RentalCatalog search={catalogSearch} />
			) : (
				<main className="container mx-auto flex flex-1 items-center justify-center px-4 py-12">
					{loaderData.mode === "selection" ? (
						<BranchSelection
							branches={loaderData.branches}
							invalidBranchRequested={loaderData.invalidBranchRequested}
							onSelect={handleBranchSelect}
						/>
					) : (
						<CatalogUnavailable />
					)}
				</main>
			)}
			<FloatingWhatsAppButton />
		</div>
	);
}

function RentalCatalog({ search }: { search: RentalCatalogSearch }) {
	const { setUrlParam, handleCategorySelect, handleBranchChange } =
		useRentalPageSearch(search);
	return (
		<main className="container mx-auto px-4">
			<RentalFilters
				search={search}
				onBranchChange={handleBranchChange}
				setUrlParam={setUrlParam}
				onCategorySelect={handleCategorySelect}
			/>

			<nav
				aria-label="Navegación del catálogo"
				className="flex items-center gap-4 pt-6"
			>
				<span className="text-sm text-muted-foreground">Explorar</span>

				<a
					href="#combos"
					className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
				>
					Combos
				</a>

				<a
					href="#equipos"
					className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
				>
					Equipos
				</a>
			</nav>

			<SectionErrorBoundary message="Nuestro inventario no está disponible.">
				<Suspense fallback={<ProductCatalogSkeleton />}>
					<CombosSection search={search} />
				</Suspense>
			</SectionErrorBoundary>
			<SectionErrorBoundary message="Los productos nuevos no están disponibles.">
				<Suspense fallback={<NewArrivalsSkeleton />}>
					<NewArrivals branchId={search.branchId} />
				</Suspense>
			</SectionErrorBoundary>
			<SectionErrorBoundary message="Nuestro inventario no está disponible.">
				<EquipmentCatalogSection
					search={search}
					onPageChange={(page) => setUrlParam({ page })}
					handleCategorySelect={handleCategorySelect}
					setUrlParam={setUrlParam}
				/>
			</SectionErrorBoundary>
		</main>
	);
}
