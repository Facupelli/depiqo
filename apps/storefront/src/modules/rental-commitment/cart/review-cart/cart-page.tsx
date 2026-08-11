import { Button } from "@repo/ui/components/button";
import { Link } from "@tanstack/react-router";
import { PackageOpen } from "lucide-react";
import { useCartContext, useCartPeriodContext } from "./cart-page.context";
import { CartItemList } from "./components/cart-item-list";
import { BookingCta } from "./components/booking-cta";
import { CartPagePeriod } from "./components/cart-page-period";
import { FulfillmentForm } from "./components/fulfillment-form";
import { PriceBreakdown } from "./components/price-breakdown";

export function CartPage() {
	const { items } = useCartContext();
	const { branch, periodStart, periodEnd } = useCartPeriodContext();
	if (items.length === 0) {
		return (
			<EmptyCart
				branchId={branch.id}
				periodStart={periodStart}
				periodEnd={periodEnd}
			/>
		);
	}

	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
			<div className="mb-8">
				<p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
					Tu selección
				</p>
				<h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
					Revisá tu pedido
				</h1>
			</div>
			<CartPagePeriod />
			<div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
				<CartItemList />
				<aside className="space-y-5 lg:sticky lg:top-24">
					<PriceBreakdown />
					<FulfillmentForm />
					<BookingCta />
				</aside>
			</div>
		</main>
	);
}

export function EmptyCart({
	branchId,
	periodStart,
	periodEnd,
}: {
	branchId?: string;
	periodStart?: string;
	periodEnd?: string;
}) {
	return (
		<main className="grid min-h-[70vh] place-items-center px-4">
			<div className="max-w-md text-center">
				<div className="mx-auto grid size-16 place-items-center rounded-full bg-muted">
					<PackageOpen className="size-7" />
				</div>
				<h1 className="mt-6 text-3xl font-bold">Tu pedido está vacío</h1>
				<p className="mt-3 text-muted-foreground">
					Volvé al catálogo y elegí los equipos que necesitás.
				</p>
				<Button
					className="mt-7"
					render={
						<Link to="/rental" search={{ branchId, periodStart, periodEnd }} />
					}
				>
					Explorar catálogo
				</Button>
			</div>
		</main>
	);
}
