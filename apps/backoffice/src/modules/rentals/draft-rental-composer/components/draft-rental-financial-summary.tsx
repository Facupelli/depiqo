import type { PreviewDraftRentalCostResponseDto } from "@repo/api-contracts";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Info, Loader2 } from "lucide-react";
import { formatMoney } from "@/shared/utils/formatters";

export function DraftRentalFinancialSummary({
	preview,
	isFetching,
}: {
	preview: PreviewDraftRentalCostResponseDto | undefined;
	isFetching: boolean;
}) {
	const currency = preview?.currency ?? "USD";
	const deliveryCurrency = preview?.delivery?.currency ?? currency;
	const adjustment = preview?.pricing.targetTotalAdjustment;
	const delivery = preview?.delivery;
	const pendingExplanation =
		preview?.customerTotal != null
			? null
			: delivery?.effectiveCharge === null
				? "Completá el precio de entrega y retiro para calcular el total final."
				: isFetching
					? "El total estará disponible cuando termine el cálculo."
					: "Completá los datos del alquiler para calcular el total final.";
	const money = (amount: string | null | undefined, unit = currency) =>
		amount != null ? formatMoney(amount, unit) : "-";
	return (
		<Card size="sm" className="gap-3 shadow-none">
			<CardHeader className="border-b pb-3">
				<CardTitle className="text-base">Resumen</CardTitle>
			</CardHeader>
			<CardContent>
				<div>
					<div className="space-y-2">
						<SummaryRow
							label="Equipos"
							value={money(preview?.pricing.calculated.total)}
						/>
						{adjustment && adjustment.direction !== "NONE" ? (
							<SummaryRow
								label="Ajuste manual"
								value={`${adjustment.direction === "DECREASE" ? "-" : "+"}${money(adjustment.adjustmentTotal)}`}
							/>
						) : null}
						{adjustment && adjustment.direction !== "NONE" ? (
							<SummaryRow
								label="Equipos a cobrar"
								value={money(preview?.pricing.final.total)}
							/>
						) : null}
						{preview?.pricing.insurance.applied ? (
							<SummaryRow
								label="Seguro"
								value={money(preview.pricing.insurance.amount)}
							/>
						) : null}
					</div>
					{delivery ? (
						<div className="mt-4 space-y-1.5 border-t pt-4">
							<SummaryRow
								label="Entrega y retiro"
								value={
									delivery.effectiveCharge === null
										? "Por definir"
										: money(delivery.effectiveCharge, deliveryCurrency)
								}
							/>
							{delivery.effectiveCharge !== null &&
							delivery.staffAgreedAmount !== null ? (
								<p className="text-muted-foreground text-xs">
									Importe acordado manualmente
								</p>
							) : null}
						</div>
					) : null}
					<div className="my-4 border-t" />
					<SummaryRow
						label="Total del cliente"
						value={
							preview?.customerTotal != null
								? money(preview.customerTotal)
								: "Pendiente"
						}
						strong
					/>
					{pendingExplanation ? (
						<p className="mt-3 flex items-start gap-2 text-muted-foreground text-xs">
							<Info className="mt-0.5 size-3.5 shrink-0" />
							{pendingExplanation}
						</p>
					) : null}
					{isFetching ? (
						<p className="mt-2.5 flex items-center gap-2 text-muted-foreground text-xs">
							<Loader2 className="size-3 animate-spin" /> Calculando precio...
						</p>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}

function SummaryRow({
	label,
	value,
	strong,
}: {
	label: string;
	value: string;
	strong?: boolean;
}) {
	return (
		<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
			<span
				className={strong ? "font-semibold text-base" : "text-muted-foreground"}
			>
				{label}
			</span>
			<span
				className={
					strong
						? "font-semibold text-2xl tabular-nums tracking-tight"
						: "font-medium tabular-nums"
				}
			>
				{value}
			</span>
		</div>
	);
}
