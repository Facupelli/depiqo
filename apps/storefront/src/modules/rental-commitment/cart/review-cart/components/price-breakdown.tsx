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
								key={line.rentalOfferId}
								className="flex items-start justify-between gap-4"
							>
								<div className="min-w-0">
									<p className="font-medium">{line.rentableItemName}</p>
									<p className="text-xs text-muted-foreground">
										{line.quantity} x {line.chargedUnits}{" "}
										{billingUnitLabel(line.billingUnit, line.chargedUnits)}
									</p>
									{line.appliedAdjustments.map((adjustment) => (
										<span
											key={`${adjustment.type}-${adjustment.promotionId}-${adjustment.couponId ?? "none"}`}
											className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
										>
											<Tag className="size-3" /> {adjustment.name} -
											{formatCartMoney(adjustment.amount, currency, locale)}
										</span>
									))}
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
					<div className="border-t pt-4">
						{pricing.appliedPromotions.length > 0 && (
							<MoneyRow
								label="Subtotal antes de descuentos"
								amount={pricing.subtotal}
								currency={currency}
								locale={locale}
							/>
						)}
						{Number(pricing.discountTotal) > 0 && (
							<MoneyRow
								label="Descuentos"
								amount={pricing.discountTotal}
								currency={currency}
								locale={locale}
								tone="success"
								prefix="-"
							/>
						)}
						<MoneyRow
							label="Subtotal de equipos"
							amount={pricing.totalBeforeInsurance}
							currency={currency}
							locale={locale}
						/>
						{pricing.insurance.applied && (
							<MoneyRow
								label={`${config.insuranceLabel} (${pricing.insurance.ratePercent}%)`}
								amount={pricing.insurance.amount}
								currency={currency}
								locale={locale}
							/>
						)}
					</div>
					<p className="text-xs text-muted-foreground">
						Duración facturada: {pricing.chargedDays}{" "}
						{pricing.chargedDays === 1 ? "día" : "días"}
					</p>
					{fulfillmentMethod === "DELIVERY" && delivery ? (
						<div className="border-t pt-2">
							<MoneyRow
								label="Entrega"
								amount={delivery.delivery.total}
								currency={currency}
								locale={locale}
							/>
							<MoneyRow
								label="Retiro"
								amount={delivery.collection.total}
								currency={currency}
								locale={locale}
							/>
						</div>
					) : null}
					<div className="flex items-baseline justify-between border-t pt-4">
						<strong>Total</strong>
						<strong className="text-2xl">
							{formatCartMoney(
								customerTotal ?? pricing.total,
								currency,
								locale,
							)}
						</strong>
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

function billingUnitLabel(
	unit: "HOUR" | "DAY" | "WEEK",
	units: number,
): string {
	if (unit === "HOUR") return units === 1 ? "hora" : "horas";
	if (unit === "WEEK") return units === 1 ? "semana" : "semanas";
	return units === 1 ? "día" : "días";
}

function MoneyRow({
	label,
	amount,
	currency,
	locale,
	tone = "default",
	prefix = "",
}: {
	label: string;
	amount: string;
	currency: string;
	locale: string;
	tone?: "default" | "success";
	prefix?: string;
}) {
	return (
		<div
			className={`mt-2 flex justify-between gap-4 ${tone === "success" ? "text-emerald-700" : "text-muted-foreground"}`}
		>
			<span>{label}</span>
			<span>
				{prefix}
				{formatCartMoney(amount, currency, locale)}
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
