import { Skeleton } from "@repo/ui/components/skeleton";
import { Tag } from "lucide-react";
import { formatCurrency } from "@/shared/utils/price.utils";
import {
	useCartPeriodContext,
	useCartPricingContext,
} from "../cart-page.context";

export function PriceBreakdown() {
	const { isPricingReady, isPeriodInvalid } = useCartPeriodContext();
	const {
		pricing,
		isPriceLoading,
		isPriceError,
		config,
		insuranceSelected,
		setInsuranceSelected,
	} = useCartPricingContext();
	const currency = pricing?.currency ?? config.currency;
	const locale = pricing?.locale ?? config.locale;

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
											{formatCurrency(
												Number(adjustment.amount),
												currency,
												locale,
											)}
										</span>
									))}
								</div>
								<div className="shrink-0 text-right">
									{Number(line.discountTotal) > 0 && (
										<p className="text-xs text-muted-foreground line-through">
											{formatCurrency(Number(line.subtotal), currency, locale)}
										</p>
									)}
									<p className="font-semibold">
										{formatCurrency(Number(line.total), currency, locale)}
									</p>
								</div>
							</div>
						))}
					</div>
					<div className="border-t pt-4">
						<MoneyRow
							label="Subtotal antes de descuentos"
							amount={pricing.subtotal}
							currency={currency}
							locale={locale}
						/>
						{Number(pricing.discountTotal) > 0 && (
							<MoneyRow
								label="Descuentos"
								amount={`-${pricing.discountTotal}`}
								currency={currency}
								locale={locale}
								tone="success"
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
								label={`Seguro (${pricing.insurance.ratePercent}%)`}
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
					<div className="flex items-baseline justify-between border-t pt-4">
						<strong>Total</strong>
						<strong className="text-2xl">
							{formatCurrency(Number(pricing.total), currency, locale)}
						</strong>
					</div>
				</div>
			) : (
				<p className="mt-4 text-sm text-muted-foreground">
					El precio todavía no está disponible.
				</p>
			)}
			{config.insuranceEnabled && (
				<label className="mt-5 flex cursor-pointer items-center gap-3 border-t pt-4 text-sm">
					<input
						type="checkbox"
						checked={insuranceSelected}
						onChange={(event) => setInsuranceSelected(event.target.checked)}
					/>
					Incluir seguro
				</label>
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
}: {
	label: string;
	amount: string;
	currency: string;
	locale: string;
	tone?: "default" | "success";
}) {
	return (
		<div
			className={`mt-2 flex justify-between gap-4 ${tone === "success" ? "text-emerald-700" : "text-muted-foreground"}`}
		>
			<span>{label}</span>
			<span>{formatCurrency(Number(amount), currency, locale)}</span>
		</div>
	);
}
