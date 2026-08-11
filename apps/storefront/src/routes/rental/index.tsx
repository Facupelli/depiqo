import {
	createFileRoute,
	notFound,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { Suspense } from "react";
import { RentalFilters } from "@/modules/catalog/components/catalog-filters";
import {
	ProductCatalog,
	ProductCatalogSkeleton,
} from "@/modules/catalog/components/product-catalog";
import {
	BranchSelection,
	CatalogUnavailable,
} from "@/modules/catalog/components/rental-catalog-entry-state";
import { SectionErrorBoundary } from "@/modules/catalog/components/section-error-boundary";
import { useRentalPageSearch } from "@/modules/catalog/hooks/use-catalog-page-search";
import { resolveRentalBranch } from "@/modules/catalog/rental-branch-resolution";
import {
	type RentalCatalogSearch,
	rentalCatalogSearchSchema,
} from "@/modules/catalog/rental-catalog-search";
import { storefrontRentalOfferListViewQueries } from "@/modules/catalog/storefront-rental-offer-list-view.queries";
import { CartPopover } from "@/modules/rental-commitment/cart/view-cart/cart-popover";
import { CustomerAccountAction } from "@/modules/tenant-management/auth/components/customer-account-action";
import { storefrontBranchQueries } from "@/modules/tenant-management/branches/branches.queries";
import { getTenantBranding } from "@/modules/tenant-management/tenant-branding/tenant-branding";

export const Route = createFileRoute("/rental/")({
	validateSearch: rentalCatalogSearchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient, tenantContext }, deps }) => {
		if (!tenantContext || tenantContext.face !== "storefront") {
			throw notFound();
		}

		const branches = await queryClient.ensureQueryData(
			storefrontBranchQueries.list(),
		);
		const resolution = resolveRentalBranch(deps.branchId, branches);
		const branding = getTenantBranding(tenantContext.tenant);

		if (resolution.kind === "redirect") {
			throw redirect({
				to: "/rental",
				search: { ...deps, branchId: resolution.branchId },
				replace: true,
			});
		}

		if (resolution.kind === "catalog") {
			const search: RentalCatalogSearch = {
				...deps,
				branchId: resolution.branchId,
			};
			await queryClient.ensureQueryData(
				storefrontRentalOfferListViewQueries.list(search),
			);
			return { mode: "catalog" as const, search, branding };
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
	pendingComponent: ProductCatalogSkeleton,
	component: RentalPage,
});

function RentalPage() {
	const loaderData = Route.useLoaderData();
	const navigate = useNavigate({ from: "/rental/" });
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
						{loaderData.mode === "catalog" && (
							<CartPopover search={loaderData.search} />
						)}
						<CustomerAccountAction />
					</div>
				</div>
			</header>
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
