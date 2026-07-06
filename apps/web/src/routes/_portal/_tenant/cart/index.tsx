import { createFileRoute, useSearch } from "@tanstack/react-router";
import z from "zod";
import { CartPageProvider } from "@/features/rental-commitment/cart/storefront-cart/cart-page.context";
import { FulfillmentForm } from "@/features/rental-commitment/cart/storefront-cart/components/cart-sidebar/fulfillment-form";
import { PriceBreakdown } from "@/features/rental-commitment/cart/storefront-cart/components/cart-sidebar/price-breakdown";
import {
	MobileSidebarCta,
	SidebarSubmitButton,
} from "@/features/rental-commitment/cart/storefront-cart/components/cart-sidebar/sidebar-cta";
import {
	BookingErrorMessage,
	SidebarNotices,
} from "@/features/rental-commitment/cart/storefront-cart/components/cart-sidebar/sidebar-notices";
import { CartPageConflictPanel } from "@/features/rental-commitment/cart/storefront-cart/components/cartpage-conflict-panel";
import { CartPageItemList } from "@/features/rental-commitment/cart/storefront-cart/components/cartpage-itemlist";
import { CartPagePeriod } from "@/features/rental-commitment/cart/storefront-cart/components/cartpage-period";
import { useCartSidebarViewModel } from "@/features/rental-commitment/cart/storefront-cart/hooks/use-cart-sidebar-view-model";
import { useIsVisible } from "@/shared/hooks/use-is-visible";
import { storefrontBranchQueries } from "@/features/rental-commitment/branches/branches.queries";
import { tenantQueries } from "@/features/tenant-management/tenant/tenant.queries";

const cartPageSearchSchema = z.object({
	periodStart: z.iso.date(),
	periodEnd: z.iso.date(),
	branchId: z.string(),
});

export const Route = createFileRoute("/_portal/_tenant/cart/")({
	validateSearch: cartPageSearchSchema,
	component: CartPage,
	loader: async ({ context: { queryClient } }) => {
		await Promise.all([
			queryClient.ensureQueryData(storefrontBranchQueries.list()),
			queryClient.ensureQueryData(tenantQueries.publicConfig()),
		]);
	},
});

function CartPage() {
	const { branchId, periodStart, periodEnd } = useSearch({
		from: "/_portal/_tenant/cart/",
	});

	return (
		<CartPageProvider
			branchId={branchId}
			periodStart={periodStart}
			periodEnd={periodEnd}
		>
			<div className="min-h-screen bg-neutral-50">
				<div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-12 space-y-8">
					<div>
						<h1 className="text-4xl font-black uppercase tracking-tight text-black">
							Revisa Tu Pedido
						</h1>
						<p className="mt-2 text-sm text-neutral-500">
							Revisa tu pedido y asegúrate de que todo está en orden.
						</p>
					</div>

					<CartPagePeriod />

					<CartPageConflictPanel />

					{/*
          CSS Grid — two-column layout:
          Left column owns the content flow.
          Right column is fixed-width sticky sidebar.
          Mobile: single column, sidebar stacks below.
        */}
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-12">
						<CartPageItemList />
						<CartPageSidebar />
					</div>
				</div>
			</div>
		</CartPageProvider>
	);
}

function CartPageSidebar() {
	const viewModel = useCartSidebarViewModel();
	const [submitButtonRef, isSubmitButtonVisible] =
		useIsVisible<HTMLButtonElement>();

	return (
		<>
			<div className="border border-neutral-200 bg-white p-6 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
				<PriceBreakdown />
				<FulfillmentForm />

				{viewModel.isBookingError && viewModel.bookingErrorMessage && (
					<BookingErrorMessage message={viewModel.bookingErrorMessage} />
				)}

				<SidebarSubmitButton
					viewModel={viewModel}
					buttonRef={submitButtonRef}
				/>
				<SidebarNotices isAuthenticated={viewModel.isAuthenticated} />
			</div>

			<MobileSidebarCta
				viewModel={viewModel}
				isSubmitButtonVisible={isSubmitButtonVisible}
			/>
		</>
	);
}
