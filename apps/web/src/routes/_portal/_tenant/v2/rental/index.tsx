import type { AuthCustomerDto } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { RentalHeaderAuthAction } from "@/features/rental/auth/components/rental-header-auth-action";
import { CartPopover } from "@/features/rental/cart/components/cart-popover";
import { RentalFilters } from "@/features/rental/catalog/components/catalog-filters";
import {
	ProductCatalog,
	ProductCatalogSkeleton,
} from "@/features/rental/catalog/components/product-catalog";
import { SectionErrorBoundary } from "@/features/rental/catalog/components/section-error-boundary";
import { useRentalPageSearch } from "@/features/rental/catalog/hooks/use-catalog-page-search";
import { getTenantBranding } from "@/features/tenant-branding/tenant-branding";
import { cn } from "@/lib/utils";
import { storefrontRentalOfferListViewQueries } from "@/v2/features/storefront/rental-offers/storefront-rental-offer-list-view.queries";

const v2RentalSearchSchema = z.object({
	branchId: z.string().trim().min(1),
	page: z.coerce.number().int().positive().default(1),
	pageSize: z.coerce.number().int().positive().max(100).default(20),
	periodStart: z.iso.date().optional(),
	periodEnd: z.iso.date().optional(),
	categoryId: z.string().optional(),
	search: z.string().optional(),
});

export type V2RentalPageSearch = z.infer<typeof v2RentalSearchSchema>;

export const Route = createFileRoute("/_portal/_tenant/v2/rental/")({
	validateSearch: v2RentalSearchSchema,
	loaderDeps: ({ search }) => ({
		branchId: search.branchId,
		page: search.page,
		pageSize: search.pageSize,
	}),
	loader: async ({ context: { queryClient, tenantContext }, deps }) => {
		await queryClient.ensureQueryData(
			storefrontRentalOfferListViewQueries.list(deps),
		);

		return {
			tenantName: tenantContext.tenant.name,
		};
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData?.tenantName
					? `${loaderData.tenantName} | V2 Alquiler de Equipos`
					: "Depiqo | V2 Alquiler de Equipos",
			},
		],
	}),
	component: V2RentalPage,
});

function V2RentalPage() {
	const { search, setUrlParam, handleCategorySelect, handleBranchChange } =
		useRentalPageSearch();

	return (
		<div className="flex flex-col min-h-screen bg-gray-50">
			<RentalHeader />

			<main className="container mx-auto px-4">
				<RentalFilters
					search={search}
					onBranchChange={handleBranchChange}
					setUrlParam={setUrlParam}
					onCategorySelect={handleCategorySelect}
				/>

				<SectionErrorBoundary message="Nuestro inventario no está disponible.">
					<Suspense fallback={<ProductCatalogSkeleton />}>
						<ProductCatalog
							search={search}
							onPageChange={(page) => setUrlParam({ page })}
							handleCategorySelect={handleCategorySelect}
							setUrlParam={setUrlParam}
						/>
					</Suspense>
				</SectionErrorBoundary>
			</main>
		</div>
	);
}

function RentalHeader() {
	const { tenantContext, user } = Route.useRouteContext();
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
					<RentalHeaderAuthAction user={user as AuthCustomerDto | null} />
				</div>
			</div>
		</header>
	);
}
