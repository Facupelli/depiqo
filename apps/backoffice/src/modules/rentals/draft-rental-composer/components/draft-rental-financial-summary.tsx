import type { PreviewDraftRentalCostResponseDto } from "@repo/api-contracts";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Loader2 } from "lucide-react";
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
	const money = (amount: string | null | undefined, unit = currency) =>
		amount != null ? formatMoney(amount, unit) : "-";
	return (
		<Card size="sm" className="gap-3 shadow-none">
			<CardHeader>
				<CardTitle className="text-base">Resumen</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="rounded-lg border bg-muted/20 p-3">
					<div className="space-y-2">
						<SummaryRow
							label="Equipos (calculado)"
							value={money(preview?.pricing.calculated.total)}
						/>
						{adjustment && adjustment.direction !== "NONE" ? (
							<SummaryRow
								label="Ajuste manual"
								value={`${adjustment.direction === "DECREASE" ? "-" : "+"}${money(adjustment.adjustmentTotal)}`}
							/>
						) : null}
						<SummaryRow
							label="Equipos (final)"
							value={money(preview?.pricing.final.total)}
						/>
						<SummaryRow
							label="Seguro"
							value={money(preview?.pricing.insurance.amount)}
						/>
						{preview?.delivery ? (
							<>
								<SummaryRow
									label="Envío calculado (referencia)"
									value={
										preview.delivery.calculatedCharge === null
											? "No disponible"
											: money(
													preview.delivery.calculatedCharge,
													deliveryCurrency,
												)
									}
								/>
								{preview.delivery.staffAgreedAmount !== null ? (
									<SummaryRow
										label="Envío acordado"
										value={money(
											preview.delivery.staffAgreedAmount,
											deliveryCurrency,
										)}
									/>
								) : null}
								<SummaryRow
									label="Envío a cobrar"
									value={
										preview.delivery.effectiveCharge === null
											? "Pendiente"
											: money(
													preview.delivery.effectiveCharge,
													deliveryCurrency,
												)
									}
								/>
							</>
						) : null}
					</div>
					<div className="my-2.5 border-t" />
					<SummaryRow
						label="Total del cliente"
						value={money(preview?.customerTotal)}
						strong
					/>
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
		<div className="flex items-center justify-between gap-3 text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span
				className={
					strong
						? "font-semibold text-lg tabular-nums tracking-tight"
						: "font-medium tabular-nums"
				}
			>
				{value}
			</span>
		</div>
	);
}
