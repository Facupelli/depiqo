import type { CalculateCartPriceResponseDto } from "@repo/api-contracts";
import {
	AlertTriangle,
	Check,
	CircleHelp,
	Tag,
	TicketPercent,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/shared/utils/price.utils";
import { useCartPricingContext } from "../../cart-page.context";
import {
	CART_MONEY_FRACTION_DIGITS,
	parseCartMoneyAmount,
} from "../../utils/cart-money.utils";

type CartPriceLine = CalculateCartPriceResponseDto["lines"][number];
type CartPriceLineAdjustment = CartPriceLine["appliedAdjustments"][number];

export function PriceBreakdown() {
	const {
		preview,
		fallbackCurrency,
		fallbackLocale,
		insuranceEnabled,
		insuranceSelected,
		isPriceLoading,
		isPriceError,
		onInsuranceSelectedChange,
	} = useCartPricingContext();

	if (isPriceError) {
		return (
			<div className="flex items-start gap-3 border border-red-100 bg-red-50 px-4 py-3">
				<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
				<p className="text-xs font-semibold uppercase tracking-wider text-red-600">
					No se puede calcular el precio. Por favor, inténtalo de nuevo.
				</p>
			</div>
		);
	}

	const displayCurrency = preview?.currency ?? fallbackCurrency;
	const displayLocale = preview?.locale ?? fallbackLocale;
	const subtotalAmount = parseCartMoneyAmount(preview?.subtotal);
	const discountTotalAmount = parseCartMoneyAmount(preview?.discountTotal);
	const totalBeforeInsuranceAmount = parseCartMoneyAmount(
		preview?.totalBeforeInsurance,
	);
	const insuranceAmount = parseCartMoneyAmount(preview?.insurance?.amount);
	const totalAmount = parseCartMoneyAmount(preview?.total);
	const hasSavings = (discountTotalAmount ?? 0) > 0;
	const shouldShowInsuranceRow = preview?.insurance?.applied === true;
	const insuranceRatePercent =
		parseCartMoneyAmount(preview?.insurance?.ratePercent) ?? 0;

	return (
		<div>
			<h3 className="mb-4 text-sm font-black uppercase tracking-wide text-black">
				Desglose de precio
			</h3>

			<div className="space-y-4">
				{isPriceLoading
					? ["line-item-skeleton-1", "line-item-skeleton-2"].map((key) => (
							<div key={key} className="flex items-start justify-between gap-4">
								<Skeleton className="h-8 w-32" />
								<Skeleton className="h-5 w-16" />
							</div>
						))
					: preview?.lines?.map((line) => (
							<LineItemRow
								key={line.rentalOfferId}
								line={line}
								currency={displayCurrency}
								locale={displayLocale}
							/>
						))}
			</div>

			{insuranceEnabled ? (
				<>
					<div className="my-4 border-t border-neutral-200" />
					<InsuranceToggleRow
						checked={insuranceSelected}
						onCheckedChange={onInsuranceSelectedChange}
						ratePercent={insuranceRatePercent}
					/>
				</>
			) : null}

			{/* Dormant until coupon support is enabled: <CouponInputRow /> */}

			<div className="my-4 border-t border-neutral-200" />

			<BreakdownRow
				label="Subtotal antes de descuentos"
				value={subtotalAmount}
				isLoading={isPriceLoading}
				currency={displayCurrency}
				locale={displayLocale}
			/>

			{hasSavings && (
				<BreakdownRow
					label="Descuentos"
					value={discountTotalAmount}
					isLoading={isPriceLoading}
					currency={displayCurrency}
					locale={displayLocale}
					tone="success"
					prefix="−"
				/>
			)}

			<BreakdownRow
				label="Subtotal de equipos"
				value={totalBeforeInsuranceAmount}
				isLoading={isPriceLoading}
				currency={displayCurrency}
				locale={displayLocale}
			/>

			{shouldShowInsuranceRow && (
				<BreakdownRow
					label="Seguro de equipos"
					value={insuranceAmount}
					isLoading={isPriceLoading}
					currency={displayCurrency}
					locale={displayLocale}
				/>
			)}

			<div className="my-4 border-t border-neutral-200" />

			<div className="flex items-center justify-between">
				<p className="text-sm font-black uppercase md:tracking-wide text-black">
					Total a pagar
				</p>
				{isPriceLoading ? (
					<Skeleton className="h-7 w-28" />
				) : (
					<p className="text-xl font-black text-black">
						{totalAmount != null
							? formatCurrency(
									totalAmount,
									displayCurrency,
									displayLocale,
									CART_MONEY_FRACTION_DIGITS,
								)
							: "—"}
					</p>
				)}
			</div>

			{!isPriceLoading && hasSavings && discountTotalAmount != null && (
				<div className="-mx-6 mt-4">
					<SavingsBanner
						totalDiscount={discountTotalAmount}
						currency={displayCurrency}
						locale={displayLocale}
					/>
				</div>
			)}
		</div>
	);
}

type CouponInputRowProps = {
	couponCode: string;
	onCouponCodeChange: (value: string) => void;
	onApply: () => void;
	onClear: () => void;
	isLoading: boolean;
	couponApplied: boolean;
};

export function CouponInputRow({
	couponCode,
	onCouponCodeChange,
	onApply,
	onClear,
	isLoading,
	couponApplied,
}: CouponInputRowProps) {
	const hasValue = couponCode.trim().length > 0;

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<TicketPercent className="h-4 w-4 text-neutral-500" />
				<p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
					Cupón o código promocional
				</p>
			</div>
			<div className="flex gap-2">
				<Input
					value={couponCode}
					onChange={(event) =>
						onCouponCodeChange(event.target.value.toUpperCase())
					}
					placeholder="Ingresa tu cupón"
					className="rounded-none border-neutral-300 bg-white uppercase"
					disabled={isLoading}
				/>
				<Button
					type="button"
					variant="outline"
					className="rounded-none"
					onClick={onApply}
					disabled={!hasValue || isLoading}
				>
					Aplicar
				</Button>
				{hasValue && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="rounded-none"
						onClick={onClear}
						disabled={isLoading}
						aria-label="Quitar cupón"
					>
						<X className="h-4 w-4" />
					</Button>
				)}
			</div>
			{hasValue && (
				<p className="flex items-center gap-2 text-xs text-neutral-500">
					{couponApplied ? (
						<>
							<Check className="h-3.5 w-3.5 text-green-600" />
							<span className="text-green-700">
								El cupón se está evaluando en el precio del carrito.
							</span>
						</>
					) : (
						<span>
							Aplica el cupón para validar descuentos y promociones en esta
							vista previa.
						</span>
					)}
				</p>
			)}
		</div>
	);
}

type InsuranceToggleRowProps = {
	checked: boolean;
	onCheckedChange: (value: boolean) => void;
	ratePercent: number;
};

function InsuranceToggleRow({
	checked,
	onCheckedChange,
	ratePercent,
}: InsuranceToggleRowProps) {
	return (
		<div className="flex items-center gap-4">
			<Switch
				checked={checked}
				onCheckedChange={onCheckedChange}
				aria-label="Activar seguro de equipos"
			/>
			<div className="flex min-w-0 items-center gap-2">
				<span className="text-[15px] font-medium text-neutral-700">
					Seguro de equipos ({ratePercent}%)
				</span>
				<Popover>
					<PopoverTrigger
						render={
							<button
								type="button"
								aria-label="Más información sobre el seguro de equipos"
								className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 transition-colors hover:text-neutral-600"
							>
								<CircleHelp className="h-4 w-4" />
							</button>
						}
					/>
					<PopoverContent
						align="start"
						sideOffset={10}
						className="w-96 gap-3 border border-neutral-200 bg-neutral-900"
					>
						<PopoverHeader className="gap-2">
							<PopoverTitle className="text-sm text-neutral-50">
								Seguro de equipos
							</PopoverTitle>
							<PopoverDescription className="space-y-3 text-xs leading-5 text-neutral-200">
								<p>
									Protege tu pedido con una cobertura adicional ante imprevistos
									durante el alquiler. El cargo corresponde al {ratePercent}%
									del subtotal antes de descuentos y se suma al total final del
									pedido.
								</p>
								<p>
									El seguro NO incluye daños por el mal uso del equipo por parte
									del cliente, esto implica situaciones como rotura del puerto
									para tarjetas de la cámara, exposición del sensor a lásers,
									roturas por montar incorrectamente el equipo, etc. También
									quedan excluidos de la cobertura las averías o daños debidos a
									uso, impericia, negligencia, daños eléctricos y magnéticos,
									rozaduras y/o arañazos, daños al software, defectos latentes,
									hurto, estafa, perdida, apropiación indebida y daños por
									contaminación.
								</p>
								<p>
									Los equipos están asegurados durante los rodajes contra
									accidente consecuencia de accidentes del vehículo porteador.
									Durante las estancias (montaje y rodaje) en el seguro está
									previsto el robo, incendio, roturas, daños por agua.
								</p>
							</PopoverDescription>
						</PopoverHeader>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}

type BreakdownRowProps = {
	label: string;
	value: number | undefined;
	isLoading: boolean;
	currency: string;
	locale: string;
	tone?: "default" | "success";
	prefix?: string;
};

function BreakdownRow({
	label,
	value,
	isLoading,
	currency,
	locale,
	tone = "default",
	prefix,
}: BreakdownRowProps) {
	const textColor = tone === "success" ? "text-green-700" : "text-neutral-500";
	const valueColor =
		tone === "success"
			? "text-green-700 font-semibold"
			: "text-black font-medium";
	return (
		<div className="mt-2 flex items-center justify-between first:mt-0">
			<p className={cn("text-sm", textColor)}>{label}</p>
			{isLoading ? (
				<Skeleton className="h-5 w-20" />
			) : (
				<p className={cn("text-sm", valueColor)}>
					{value != null
						? `${prefix ?? ""}${formatCurrency(value, currency, locale, CART_MONEY_FRACTION_DIGITS)}`
						: "—"}
				</p>
			)}
		</div>
	);
}

type DiscountTagProps = {
	adjustment: CartPriceLineAdjustment;
	currency: string;
	locale: string;
};

function DiscountTag({ adjustment, currency, locale }: DiscountTagProps) {
	return (
		<div
			className="inline-flex items-center gap-1.5 border-l-2 border-green-500 bg-green-50 px-2.5 py-1"
			data-source-id={adjustment.promotionId}
		>
			<Tag className="h-2.5 w-2.5 shrink-0 text-green-600" />
			<span className="text-[10px] font-semibold uppercase tracking-wider text-green-700">
				{adjustment.name}
			</span>
			<span className="text-[10px] font-black text-green-700">
				−
				{formatCurrency(
					parseCartMoneyAmount(adjustment.amount) ?? 0,
					currency,
					locale,
					CART_MONEY_FRACTION_DIGITS,
				)}
			</span>
		</div>
	);
}

type LineItemRowProps = {
	line: CartPriceLine;
	currency: string;
	locale: string;
};

function LineItemRow({ line, currency, locale }: LineItemRowProps) {
	const discountAmount = parseCartMoneyAmount(line.discountTotal) ?? 0;
	const hasDiscounts = discountAmount > 0;
	const originalSubtotal = parseCartMoneyAmount(line.subtotal);
	const lineTotal = parseCartMoneyAmount(line.total);
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="flex flex-col gap-1">
				<p className="text-sm text-black">{line.rentableItemName}</p>
				{hasDiscounts && (
					<div className="mt-1 flex flex-wrap gap-1">
						{line.appliedAdjustments.map((adjustment) => (
							<DiscountTag
								key={`${adjustment.type}-${adjustment.promotionId}-${adjustment.couponId ?? "none"}`}
								adjustment={adjustment}
								currency={currency}
								locale={locale}
							/>
						))}
					</div>
				)}
			</div>
			<div className="flex shrink-0 flex-col items-end gap-0.5">
				{hasDiscounts && originalSubtotal != null && (
					<span className="text-xs text-neutral-400 line-through">
						{formatCurrency(
							originalSubtotal,
							currency,
							locale,
							CART_MONEY_FRACTION_DIGITS,
						)}
					</span>
				)}
				<span className="text-sm font-semibold text-black">
					{lineTotal != null
						? formatCurrency(
								lineTotal,
								currency,
								locale,
								CART_MONEY_FRACTION_DIGITS,
							)
						: "—"}
				</span>
			</div>
		</div>
	);
}

type SavingsBannerProps = {
	totalDiscount: number;
	currency: string;
	locale: string;
};

function SavingsBanner({
	totalDiscount,
	currency,
	locale,
}: SavingsBannerProps) {
	return (
		<div className="flex items-center justify-between border-t-2 border-green-500 bg-green-50 px-4 py-2.5">
			<p className="text-[10px] font-semibold uppercase tracking-widest text-green-700">
				Ahorraste en este pedido
			</p>
			<p className="text-sm font-black text-green-700">
				{formatCurrency(
					totalDiscount,
					currency,
					locale,
					CART_MONEY_FRACTION_DIGITS,
				)}
			</p>
		</div>
	);
}
