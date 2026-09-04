import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Switch } from "@repo/ui/components/switch";
import { CircleHelp, Tag } from "lucide-react";
import { formatCartMoney, parseCartMoneyAmount } from "../cart-money.utils";
import {
	useCartFulfillmentContext,
	useCartPeriodContext,
	useCartPricingContext,
} from "../cart-page.context";
import {
	derivePromotionPresentations,
	type PromotionPresentation,
} from "../price-breakdown.utils";

export function PriceBreakdown() {
	const { isPricingReady, isPeriodInvalid } = useCartPeriodContext();
	const { fulfillmentMethod } = useCartFulfillmentContext();
	const {
		pricing,
		delivery,
		customerTotal,
		currency: responseCurrency,
		isPriceLoading,
		isPriceError,
		config,
		insuranceSelected,
		setInsuranceSelected,
	} = useCartPricingContext();
	const currency = responseCurrency ?? pricing?.currency ?? config.currency;
	const locale = pricing?.locale ?? config.locale;
	const insuranceRatePercent = parseCartMoneyAmount(
		pricing?.insurance.ratePercent,
	);
	const promotions = pricing ? derivePromotionPresentations(pricing) : [];
	const orderPromotions = promotions.filter(
		(promotion) => promotion.placement === "ORDER",
	);
	const linePromotions = promotions.filter(
		(promotion) => promotion.placement === "LINES",
	);
	const isDeliveryUpdating = fulfillmentMethod === "DELIVERY" && isPriceLoading;

	return (
		<section className="rounded-xl border bg-card p-5">
			<h2 className="text-lg font-bold">Resumen</h2>
			{!isPricingReady ? (
				<p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
					{isPeriodInvalid
						? "Corregí los horarios para calcular el precio."
						: "Seleccioná los horarios de retiro y devolución para calcular el precio."}
				</p>
			) : isPriceLoading && !pricing ? (
				<div className="mt-5 space-y-3">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-4/5" />
					<Skeleton className="h-8 w-full" />
				</div>
			) : isPriceError ? (
				<p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
					No pudimos actualizar el precio. Intentá nuevamente.
				</p>
			) : pricing ? (
				<div className="mt-5 space-y-4 text-sm">
					<div className="space-y-4">
						{pricing.lines.map((line) => (
							<div
								key={line.lineReference}
								className="flex items-start justify-between gap-4"
							>
								<div className="min-w-0">
									<p className="font-medium">{line.rentableItemName}</p>
									<p className="text-xs text-muted-foreground">
										{line.quantity} {unitLabel(line.quantity)} ·{" "}
										{line.chargedUnits}{" "}
										{billingUnitLabel(line.billingUnit, line.chargedUnits)}
									</p>
									{linePromotions.flatMap((promotion) => {
										const amount = promotion.affectedLines.get(
											line.lineReference,
										);
										return amount == null
											? []
											: [
													<PromotionBadge
														key={promotion.promotionId}
														promotion={promotion}
														amount={amount}
														currency={currency}
														locale={locale}
													/>,
												];
									})}
								</div>
								<div className="shrink-0 text-right">
									{Number(line.discountTotal) > 0 && (
										<p className="text-xs text-muted-foreground line-through">
											{formatCartMoney(line.subtotal, currency, locale)}
										</p>
									)}
									<p className="font-semibold">
										{formatCartMoney(line.total, currency, locale)}
									</p>
								</div>
							</div>
						))}
					</div>
					{config.insuranceEnabled && (
						<InsuranceToggleRow
							checked={insuranceSelected}
							onCheckedChange={setInsuranceSelected}
							label={config.insuranceLabel}
							description={config.insuranceDescription}
							ratePercent={insuranceRatePercent}
						/>
					)}
					<div className="space-y-2 border-t pt-4">
						<MoneyRow
							label="Equipos"
							amount={pricing.totalBeforeInsurance}
							currency={currency}
							locale={locale}
						/>
						{orderPromotions.map((promotion) => (
							<PromotionRow
								key={promotion.promotionId}
								promotion={promotion}
								currency={currency}
								locale={locale}
							/>
						))}
						{pricing.insurance.applied && (
							<MoneyRow
								label={config.insuranceLabel}
								amount={pricing.insurance.amount}
								currency={currency}
								locale={locale}
							/>
						)}
						{fulfillmentMethod === "DELIVERY" && (
							<MoneyRow
								label="Entrega y recogida"
								amount={delivery?.total}
								pending={isDeliveryUpdating}
								pendingLabel="Calculando…"
								currency={currency}
								locale={locale}
							/>
						)}
					</div>
					<div className="border-t pt-4">
						<div className="flex items-baseline justify-between gap-4">
							<strong>Total</strong>
							<strong className="text-2xl">
								{isDeliveryUpdating
									? "Actualizando…"
									: formatCartMoney(
											customerTotal ?? pricing.total,
											currency,
											locale,
										)}
							</strong>
						</div>
						{Number(pricing.discountTotal) > 0 && (
							<p className="mt-1 text-right text-xs font-medium text-emerald-700">
								Has ahorrado{" "}
								{formatCartMoney(pricing.discountTotal, currency, locale)} en
								equipos
							</p>
						)}
					</div>
				</div>
			) : (
				<p className="mt-4 text-sm text-muted-foreground">
					El precio todavía no está disponible.
				</p>
			)}
		</section>
	);
}

function unitLabel(quantity: number): string {
	return quantity === 1 ? "unidad" : "unidades";
}

function billingUnitLabel(
	unit: "HOUR" | "DAY" | "WEEK",
	units: number,
): string {
	if (unit === "HOUR") return units === 1 ? "hora" : "horas";
	if (unit === "WEEK") return units === 1 ? "semana" : "semanas";
	return units === 1 ? "día" : "días";
}

function PromotionBadge({
	promotion,
	amount,
	currency,
	locale,
}: {
	promotion: PromotionPresentation;
	amount: string;
	currency: string;
	locale: string;
}) {
	return (
		<span className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
			<Tag className="size-3" /> {promotion.name} · Ahorras{" "}
			{formatCartMoney(amount, currency, locale)}
		</span>
	);
}

function PromotionRow({
	promotion,
	currency,
	locale,
}: {
	promotion: PromotionPresentation;
	currency: string;
	locale: string;
}) {
	return (
		<div className="flex items-center justify-between gap-4 text-xs font-medium text-emerald-700">
			<span className="inline-flex min-w-0 items-center gap-1">
				<Tag className="size-3 shrink-0" />
				<span className="truncate">{promotion.name}</span>
			</span>
			<span className="shrink-0">
				Ahorras {formatCartMoney(promotion.totalAmount, currency, locale)}
			</span>
		</div>
	);
}

function MoneyRow({
	label,
	amount,
	currency,
	locale,
	pending = false,
	pendingLabel = "Actualizando…",
}: {
	label: string;
	amount?: string;
	currency: string;
	locale: string;
	pending?: boolean;
	pendingLabel?: string;
}) {
	return (
		<div className="flex justify-between gap-4 text-muted-foreground">
			<span>{label}</span>
			<span>
				{pending
					? pendingLabel
					: amount == null
						? "-"
						: formatCartMoney(amount, currency, locale)}
			</span>
		</div>
	);
}

function InsuranceToggleRow({
	checked,
	onCheckedChange,
	label,
	description,
	ratePercent,
}: {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	label: string;
	description: string;
	ratePercent?: number;
}) {
	return (
		<div className="mt-5 flex items-center gap-4 border-t pt-4">
			<Switch
				checked={checked}
				onCheckedChange={onCheckedChange}
				aria-label={`Activar ${label}`}
			/>
			<div className="flex min-w-0 items-center gap-1.5">
				<span className="text-sm font-medium">
					{label}
					{ratePercent == null ? "" : ` (${ratePercent}%)`}
				</span>
				<Popover>
					<PopoverTrigger
						render={
							<button
								type="button"
								aria-label={`Más información sobre ${label}`}
								className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<CircleHelp className="size-4" />
							</button>
						}
					/>
					<PopoverContent
						align="start"
						sideOffset={8}
						className="w-[min(24rem,calc(100vw-2rem))] gap-3 bg-foreground p-4 text-background"
					>
						<PopoverHeader className="gap-2">
							<PopoverTitle className="text-sm text-background">
								{label}
							</PopoverTitle>
							<PopoverDescription className="text-xs leading-5 whitespace-pre-line text-background/80">
								{description}
							</PopoverDescription>
						</PopoverHeader>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}
