import { ChevronDown, ReceiptText } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useOrderDetailContext } from "@/features/orders/contexts/order-detail.context";
import { SidebarCardHeader } from "@/features/orders/components/order-detail-sidebar-primitives";
import { formatMoney } from "@/features/orders/order.utils";
import { formatSignedMoney } from "@/features/orders/order-detail.utils";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";

export function OrderFinancialsCard() {
	const { order } = useOrderDetailContext();
	const { financial } = order;
	const [showItems, setShowItems] = useState(false);
	const [showAudit, setShowAudit] = useState(false);

	const hasAdjustedLines = financial.items.some(
		(line) => line.pricing.isOverridden,
	);
	const hasOwnerObligations = financial.ownerObligations !== "0";
	const hasInsurance = financial.insuranceApplied;
	const hasDiscounts = financial.itemsDiscountTotal !== "0";
	const showSubtotalChain = hasDiscounts || hasInsurance;

	return (
		<section className="bg-white border border-neutral-200 rounded-lg p-5">
			<button
				type="button"
				onClick={() => {
					setShowItems((prev) => !prev);
					if (showItems) setShowAudit(false);
				}}
				className="flex w-full items-start justify-between gap-4 text-left"
			>
				<div className="min-w-0 flex-1">
					<SidebarCardHeader
						icon={<ReceiptText className="size-4" />}
						title="Resumen financiero"
					/>
				</div>
				<div className="flex shrink-0 items-center gap-2 pt-1 text-neutral-400">
					<ChevronDown
						className={`size-4 transition-transform ${showItems ? "rotate-180" : ""}`}
					/>
				</div>
			</button>

			{/* Hero total — tight gap below header, no bottom padding when no chain follows */}
			<div
				className={`flex items-baseline justify-between pt-3 ${showSubtotalChain || hasOwnerObligations || showItems ? "pb-3" : ""}`}
			>
				<span className="text-sm font-bold text-neutral-950">Total</span>
				<span className="font-mono text-xl font-bold text-neutral-950 tracking-tight">
					{formatMoney(financial.total)}
				</span>
			</div>

			{/* Subtotal chain — only mounts when it carries information */}
			{showSubtotalChain && (
				<div className="border-t border-dashed border-neutral-200 pt-3 space-y-2">
					<FinancialSummaryRow
						label="Subtotal antes de descuentos"
						value={financial.subtotalBeforeDiscounts}
					/>
					{hasDiscounts && (
						<FinancialSummaryRow
							label="Descuentos de artículos"
							value={financial.itemsDiscountTotal}
							tone="success"
							prefix="-"
						/>
					)}
					{hasInsurance && (
						<FinancialSummaryRow
							label="Seguro de equipos"
							value={financial.insuranceAmount}
						/>
					)}
				</div>
			)}

			{/* Revenue split */}
			{hasOwnerObligations && (
				<div className="border-t border-dashed border-neutral-200 mt-3 pt-3 flex flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<span className="text-xs text-neutral-500">Tus ingresos</span>
						<span className="font-mono text-xs font-medium text-emerald-700">
							{formatMoney(financial.yourRevenue)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-xs text-neutral-500">
							Obligaciones con propietarios
						</span>
						<span className="font-mono text-xs font-medium text-amber-600">
							{formatMoney(financial.ownerObligations)}
						</span>
					</div>
				</div>
			)}

			{/* Item breakdown — only mounts when expanded, no wrapper div when collapsed */}
			{showItems && (
				<div className="border-t border-neutral-100 mt-3 pt-3">
					{hasAdjustedLines && (
						<div className="mb-3 flex items-start justify-between gap-4 rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2.5">
							<div>
								<p className="text-sm font-medium text-amber-900">
									Hay precios ajustados manualmente
								</p>
								<p className="text-xs text-amber-800/80">
									Mostrar auditoria detallada por línea
								</p>
							</div>
							<Switch
								checked={showAudit}
								onCheckedChange={setShowAudit}
								aria-label="Mostrar auditoria de ajustes manuales"
							/>
						</div>
					)}

					{financial.items.map((line) => (
						<div key={line.orderItemId} className="border-b border-neutral-100">
							<div className="flex items-center justify-between py-2">
								<span className="text-sm text-neutral-500">{line.label}</span>
								<span
									className={`font-mono text-sm ${
										line.discounts.length > 0
											? "text-neutral-400"
											: "text-neutral-950"
									}`}
								>
									{formatMoney(line.basePrice)}
								</span>
							</div>

							{line.discounts.length > 0 && (
								<div className="border-l border-neutral-200 pl-3 flex flex-col gap-1">
									{line.discounts.map((discount) => (
										<div
											key={`${discount.sourceId}-${discount.promotionId}-${discount.label}`}
											className="flex items-center justify-between"
										>
											<span className="text-[11px] text-neutral-400">
												{discount.label}
											</span>
											<span className="font-mono text-[11px] text-emerald-600">
												-{formatMoney(discount.discountAmount)}
											</span>
										</div>
									))}
								</div>
							)}

							{line.discounts.length > 0 && (
								<div className="flex items-center justify-end pt-0.5 pb-1">
									<span className="font-mono text-sm font-semibold text-neutral-950">
										{formatMoney(line.finalPrice)}
									</span>
								</div>
							)}

							{line.pricing.isOverridden && showAudit && (
								<PricingAuditSection line={line} />
							)}

							{line.ownerSplit && (
								<div className="border-l border-accent pb-2.5 pl-3 flex flex-col gap-1">
									{line.ownerSplit.componentName && (
										<span className="text-[10px] font-mono tracking-wide uppercase text-neutral-400 mt-0.5">
											{line.ownerSplit.componentName}
										</span>
									)}
									<div className="flex items-center justify-between">
										<span className="text-[11px] text-neutral-400">
											Propietario - {line.ownerSplit.ownerName}
										</span>
										<span className="font-mono text-[11px] text-neutral-400">
											{formatMoney(line.ownerSplit.ownerAmount)}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-[11px] text-neutral-400">Renta</span>
										<span className="font-mono text-[11px] text-neutral-400">
											{formatMoney(line.ownerSplit.rentalAmount)}
										</span>
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</section>
	);
}

function FinancialSummaryRow({
	label,
	value,
	tone = "default",
	prefix,
}: {
	label: string;
	value: string;
	tone?: "default" | "success";
	prefix?: string;
}) {
	const labelClassName =
		tone === "success" ? "text-sm text-green-700" : "text-sm text-neutral-500";
	const valueClassName =
		tone === "success"
			? "font-mono text-sm font-semibold text-green-700"
			: "font-mono text-sm text-neutral-950";

	return (
		<div className="flex items-center justify-between">
			<span className={labelClassName}>{label}</span>
			<span className={valueClassName}>
				{prefix}
				{formatMoney(value)}
			</span>
		</div>
	);
}

function PricingAuditSection({
	line,
}: {
	line: ParsedOrderDetailResponseDto["financial"]["items"][number];
}) {
	const manualOverride = line.pricing.manualOverride;
	const manualAdjustment = line.pricing.manualAdjustment;

	return (
		<div className="mt-2 rounded-md border border-amber-200 bg-amber-50/60 p-3">
			<p className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber-700">
				Auditoria de precio manual
			</p>
			<div className="mt-2 space-y-1.5">
				<PricingAuditRow
					label="Precio final calculado"
					value={formatMoney(line.pricing.calculated.finalPrice)}
				/>
				<PricingAuditRow
					label="Precio final efectivo"
					value={formatMoney(
						manualOverride?.finalPrice ?? line.pricing.effective.finalPrice,
					)}
				/>
				{manualAdjustment && (
					<PricingAuditRow
						label="Monto de ajuste manual"
						value={formatSignedMoney(manualAdjustment.adjustmentAmount)}
					/>
				)}
				{manualOverride?.setByUserId && (
					<PricingAuditRow
						label="Actualizado por"
						value={manualOverride.setByUserId}
					/>
				)}
				{manualOverride?.setAt && (
					<PricingAuditRow
						label="Actualizado el"
						value={manualOverride.setAt.format("MMM DD, YYYY [at] HH:mm")}
					/>
				)}
				{manualOverride?.previousFinalPrice && (
					<PricingAuditRow
						label="Precio manual previo"
						value={formatMoney(manualOverride.previousFinalPrice)}
					/>
				)}
			</div>
		</div>
	);
}

function PricingAuditRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span className="text-[11px] text-neutral-600">{label}</span>
			<span className="text-right font-mono text-[11px] text-neutral-950">
				{value}
			</span>
		</div>
	);
}
