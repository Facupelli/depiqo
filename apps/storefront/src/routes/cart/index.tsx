import { Skeleton } from "@repo/ui/components/skeleton";
import { createFileRoute, Navigate, notFound } from "@tanstack/react-router";
import { z } from "zod";
import {
	useRentalCartBranchId,
	useRentalCartHydrated,
	useRentalCartItems,
} from "@/modules/rental-commitment/cart/rental-cart.hooks";
import {
	CartPage,
	EmptyCart,
} from "@/modules/rental-commitment/cart/review-cart/cart-page";
import { CartPageProvider } from "@/modules/rental-commitment/cart/review-cart/cart-page.context";
import { storefrontBranchQueries } from "@/modules/tenant-management/branches/branches.queries";
import { publicTenantConfigQueries } from "@/modules/tenant-management/tenant/tenant.queries";
import { getTenantBranding } from "@/modules/tenant-management/tenant-branding/tenant-branding";

const cartSearchSchema = z.object({
	branchId: z.string().trim().min(1).optional(),
	periodStart: z.iso.date().optional(),
	periodEnd: z.iso.date().optional(),
	pickupInstant: z.iso.datetime({ offset: true }).optional(),
	returnInstant: z.iso.datetime({ offset: true }).optional(),
});

export const Route = createFileRoute("/cart/")({
	validateSearch: cartSearchSchema,
	loader: async ({ context: { queryClient, tenantContext } }) => {
		if (!tenantContext || tenantContext.face !== "storefront") throw notFound();
		const [branches, config] = await Promise.all([
			queryClient.ensureQueryData(storefrontBranchQueries.list()),
			queryClient.ensureQueryData(publicTenantConfigQueries.detail()),
		]);
		return {
			branches,
			config,
			branding: getTenantBranding(tenantContext.tenant),
		};
	},
	head: ({ loaderData }) => ({
		links: loaderData?.branding.faviconHref
			? [{ rel: "icon", href: loaderData.branding.faviconHref }]
			: [{ rel: "icon", href: "/favicon.svg" }],
	}),
	component: CartRoute,
});

function CartRoute() {
	const { branches, config } = Route.useLoaderData();
	const search = Route.useSearch();
	const hasHydrated = useRentalCartHydrated();
	const cartBranchId = useRentalCartBranchId();
	const items = useRentalCartItems();
	const branch = cartBranchId
		? branches.find((candidate) => candidate.id === cartBranchId)
		: undefined;
	const needsCanonicalBranch = Boolean(
		branch && search.branchId !== cartBranchId,
	);

	if (!hasHydrated) return <CartHydrationFallback />;
	if (items.length === 0) {
		return (
			<EmptyCart
				branchId={search.branchId}
				periodStart={search.periodStart}
				periodEnd={search.periodEnd}
			/>
		);
	}
	if (!branch) {
		return (
			<Navigate
				to="/rental"
				search={{
					periodStart: search.periodStart,
					periodEnd: search.periodEnd,
				}}
				replace
			/>
		);
	}
	if (!search.periodStart || !search.periodEnd) {
		return (
			<Navigate
				to="/rental"
				search={{
					branchId: branch.id,
					periodStart: search.periodStart,
					periodEnd: search.periodEnd,
				}}
				replace
			/>
		);
	}
	if (needsCanonicalBranch) {
		return (
			<Navigate
				to="/cart"
				search={{
					branchId: branch.id,
					periodStart: search.periodStart,
					periodEnd: search.periodEnd,
				}}
				replace
			/>
		);
	}

	return (
		<CartPageProvider
			branch={branch}
			config={config}
			periodStart={search.periodStart}
			periodEnd={search.periodEnd}
			pickupInstant={search.pickupInstant}
			returnInstant={search.returnInstant}
		>
			<CartPage />
		</CartPageProvider>
	);
}

function CartHydrationFallback() {
	return (
		<main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-12 md:px-6">
			<Skeleton className="h-12 w-72 max-w-full" />
			<Skeleton className="h-28 w-full" />
			<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
				<Skeleton className="h-96 w-full" />
				<Skeleton className="h-80 w-full" />
			</div>
		</main>
	);
}
