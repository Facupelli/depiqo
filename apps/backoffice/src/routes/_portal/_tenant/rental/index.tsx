import type { AuthCustomerDto } from "@repo/api-contracts";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { Button } from "@repo/ui/components/button";
import { storefrontBranchQueries } from "@/features/rental-commitment/branches/branches.queries";
import { CartPopover } from "@/features/rental-commitment/cart/storefront-cart/components/cart-popover";
import { RentalFilters } from "@/features/storefront/rental-offers/components/catalog-filters";
import {
	ProductCatalog,
	ProductCatalogSkeleton,
} from "@/features/storefront/rental-offers/components/product-catalog";
import {
	BranchSelection,
	CatalogUnavailable,
} from "@/features/storefront/rental-offers/components/rental-catalog-entry-state";
import { SectionErrorBoundary } from "@/features/storefront/rental-offers/components/section-error-boundary";
import { useRentalPageSearch } from "@/features/storefront/rental-offers/hooks/use-catalog-page-search";
import { resolveRentalBranch } from "@/features/storefront/rental-offers/rental-branch-resolution";
import { storefrontRentalOfferListViewQueries } from "@/features/storefront/rental-offers/storefront-rental-offer-list-view.queries";
import { RentalHeaderAuthAction } from "@/features/tenant-management/auth/components/rental-header-auth-action";
import { getTenantBranding } from "@/features/tenant-management/tenant-context/tenant-branding";
import { cn } from "@/lib/utils";

const v2RentalSearchSchema = z.object({
	branchId: z
		.string()
		.trim()
		.optional()
		.transform((value) => value || undefined),
	page: z.coerce.number().int().positive().default(1),
	pageSize: z.coerce.number().int().positive().max(100).default(20),
	periodStart: z.iso.date().optional(),
	periodEnd: z.iso.date().optional(),
	categoryId: z.string().optional(),
	search: z.string().optional(),
});

type V2RentalRouteSearch = z.infer<typeof v2RentalSearchSchema>;

export type V2RentalPageSearch = Omit<V2RentalRouteSearch, "branchId"> & {
	branchId: string;
};

export const Route = createFileRoute("/_portal/_tenant/rental/")({
	validateSearch: v2RentalSearchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient, tenantContext }, deps }) => {
		const branches = await queryClient.ensureQueryData(
			storefrontBranchQueries.list(),
		);
		const resolution = resolveRentalBranch(deps.branchId, branches);
		const tenantName = tenantContext.tenant.name;

		if (resolution.kind === "redirect") {
			throw redirect({
				to: "/rental",
				search: { ...deps, branchId: resolution.branchId },
				replace: true,
			});
		}

		if (resolution.kind === "catalog") {
			const search: V2RentalPageSearch = {
				...deps,
				branchId: resolution.branchId,
			};

			await queryClient.ensureQueryData(
				storefrontRentalOfferListViewQueries.list(search),
			);

			return { mode: "catalog" as const, search, tenantName };
		}

		if (resolution.kind === "selection") {
			return {
				mode: "selection" as const,
				branches,
				invalidBranchRequested: resolution.invalidBranchRequested,
				tenantName,
			};
		}

		return { mode: "no-branches" as const, tenantName };
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
	const loaderData = Route.useLoaderData();
	const navigate = useNavigate({ from: "/rental/" });

	function handleBranchSelect(branchId: string) {
		navigate({
			search: (previous) => ({ ...previous, branchId, page: 1 }),
			replace: true,
		});
	}

	return (
		<div className="flex min-h-screen flex-col bg-gray-50">
			<RentalHeader />

			{loaderData.mode === "catalog" ? (
				<RentalCatalog search={loaderData.search} />
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
		</div>
	);
}

function RentalCatalog({ search }: { search: V2RentalPageSearch }) {
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
