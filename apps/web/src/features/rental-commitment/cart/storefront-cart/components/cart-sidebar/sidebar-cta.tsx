import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/shared/utils/price.utils";
import type { useCartSidebarViewModel } from "../../hooks/use-cart-sidebar-view-model";
import { CART_MONEY_FRACTION_DIGITS } from "../../utils/cart-money.utils";

type SidebarViewModel = ReturnType<typeof useCartSidebarViewModel>;

type SidebarSubmitButtonProps = {
	viewModel: SidebarViewModel;
	buttonRef: React.Ref<HTMLButtonElement>;
};

export function SidebarSubmitButton({
	viewModel,
	buttonRef,
}: SidebarSubmitButtonProps) {
	return (
		<Button
			ref={buttonRef}
			onClick={viewModel.submitBooking}
			disabled={viewModel.isSubmitDisabled}
			className="mt-4 flex w-full items-center justify-center gap-2 rounded-none bg-black py-4 text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-300"
		>
			{viewModel.ctaLabel}
			{viewModel.isSubmittingOrder ? (
				<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
			) : (
				<ArrowRight className="h-3.5 w-3.5" />
			)}
		</Button>
	);
}

type MobileSidebarCtaProps = {
	viewModel: SidebarViewModel;
	isSubmitButtonVisible: boolean;
};

export function MobileSidebarCta({
	viewModel,
	isSubmitButtonVisible,
}: MobileSidebarCtaProps) {
	return (
		<div
			className={cn(
				"lg:hidden fixed bottom-0 left-0 right-0 z-20",
				"border-t border-neutral-200 bg-white px-4 py-3",
				"flex items-center justify-between gap-4",
				"transition-transform duration-200",
				isSubmitButtonVisible ? "translate-y-full" : "translate-y-0",
			)}
		>
			<div>
				<p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
					Total a pagar
				</p>
				{viewModel.isPriceLoading ? (
					<Skeleton className="mt-1 h-5 w-24" />
				) : (
					<p className="text-lg font-black text-black">
						{viewModel.totalAmount != null
							? formatCurrency(
									viewModel.totalAmount,
									viewModel.displayCurrency,
									viewModel.displayLocale,
									CART_MONEY_FRACTION_DIGITS,
								)
							: "—"}
					</p>
				)}
			</div>
			<Button
				onClick={viewModel.submitBooking}
				disabled={viewModel.isSubmitDisabled}
				className="flex items-center gap-2 rounded-none bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-300"
			>
				{viewModel.ctaLabel}
				{viewModel.isSubmittingOrder ? (
					<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
				) : (
					<ArrowRight className="h-3.5 w-3.5" />
				)}
			</Button>
		</div>
	);
}
