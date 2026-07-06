import type { CalculateCartPriceResponseDto } from "@repo/api-contracts";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { Package, ShoppingBag, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { V2RentalCartItem } from "@/features/rental-commitment/cart/v2-rental-cart.types";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { formatCurrency } from "@/shared/utils/price.utils";
import {
	useCartBookingContext,
	useCartContext,
	useCartPricingContext,
} from "../cart-page.context";

const CART_MONEY_FRACTION_DIGITS = 2;

type CartPriceLine = CalculateCartPriceResponseDto["lines"][number];

function decimalStringToNumber(value: string): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function formatBillingUnitLabel(unit: CartPriceLine["billingUnit"]): string {
	switch (unit) {
		case "HOUR":
			return "hora";
		case "DAY":
			return "día";
		case "WEEK":
			return "semana";
	}
}

export function CartPageItemList() {
	const { cartItems } = useCartContext();
	const { preview, fallbackCurrency, fallbackLocale, isPriceLoading } =
		useCartPricingContext();
	const { unavailableIds } = useCartBookingContext();

	const items = cartItems;
	const lines = preview?.lines ?? [];
	const currency = preview?.currency ?? fallbackCurrency;
	const locale = preview?.locale ?? fallbackLocale;
	const isLoading = isPriceLoading;

	const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 border border-neutral-200 py-16">
				<ShoppingBag className="h-10 w-10 text-neutral-200" />
				<div className="text-center">
					<p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
						Tu pedido está vacío
					</p>
					<p className="mt-1 text-xs text-neutral-300">Nada que revisar aún.</p>
				</div>
				<Link
					to="/rental"
					className="mt-2 text-xs font-bold uppercase tracking-widest text-black underline underline-offset-4"
				>
					Buscar Equipos →
				</Link>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-xs font-bold uppercase tracking-widest text-black">
					Equipos Seleccionados
				</h2>
				<span className="text-xs text-neutral-400">
					{totalQuantity} {totalQuantity === 1 ? "item" : "items"} seleccionados
				</span>
			</div>

			<div className="space-y-3">
				{items.map((item) => {
					const line = lines?.find(
						(line) => line.rentalOfferId === item.rentalOfferId,
					);

					return (
						<CartPageRentalOfferItem
							key={item.rentalOfferId}
							item={item}
							line={line}
							isLoading={isLoading}
							isUnavailable={unavailableIds.includes(item.rentalOfferId)}
							currency={currency}
							locale={locale}
						/>
					);
				})}
			</div>
		</div>
	);
}

type CartPageRentalOfferItemProps = {
	item: V2RentalCartItem;
	line: CartPriceLine | undefined;
	isLoading: boolean;
	isUnavailable: boolean;
	currency: string;
	locale: string;
};

export function CartPageRentalOfferItem({
	item,
	line,
	isLoading,
	isUnavailable,
	currency,
	locale,
}: CartPageRentalOfferItemProps) {
	return (
		<div
			className={clsx(
				"border bg-white border-neutral-200",
				isUnavailable && "border-red-300 border-l-4 border-l-red-500",
			)}
		>
			<div className="flex items-start gap-4 p-4">
				<div className="h-20 w-20 shrink-0 overflow-hidden">
					<CartPageImage src={item.image} alt={item.name} />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-base font-black uppercase tracking-wide text-black">
						{item.name}
					</p>
				</div>
				<div className="shrink-0 text-right">
					{isLoading ? (
						<Skeleton className="mb-1 ml-auto h-5 w-20" />
					) : line ? (
						<p className="text-base font-black text-black">
							{formatCurrency(
								decimalStringToNumber(line.pricePerUnit),
								currency,
								locale,
								CART_MONEY_FRACTION_DIGITS,
							)}{" "}
							<span className="uppercase text-xs tracking-wider font-semibold text-neutral-400">
								/ {formatBillingUnitLabel(line.billingUnit)}
							</span>
						</p>
					) : null}
					<p className="text-sm uppercase tracking-wider text-neutral-400 pt-1">
						Qty: {item.quantity}
					</p>
				</div>
			</div>

			{isUnavailable && (
				<div className="flex items-center gap-2 border-t border-red-200 bg-red-50 px-4 py-2.5">
					<XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
					<p className="text-[11px] font-bold uppercase tracking-widest text-red-600">
						No disponible para tu periodo seleccionado — cambia las fechas o
						quita este item.
					</p>
				</div>
			)}
		</div>
	);
}

type CartPageImageProps = {
	src: string | null;
	alt: string;
	className?: string;
};

function CartPageImage({ src, alt, className = "" }: CartPageImageProps) {
	const imageUrl = buildR2PublicUrl(src, "catalog");

	if (imageUrl) {
		return (
			<img
				src={imageUrl}
				alt={alt}
				className={`h-full w-full object-cover ${className}`}
			/>
		);
	}

	return (
		<div
			className={`flex h-full w-full items-center justify-center bg-neutral-100 ${className}`}
		>
			<Package className="h-6 w-6 text-neutral-300" />
		</div>
	);
}
