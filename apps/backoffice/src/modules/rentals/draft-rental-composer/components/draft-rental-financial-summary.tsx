import type { PreviewDraftRentalCostResponseDto } from "@repo/api-contracts";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Info, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { formatMoney } from "@/shared/utils/formatters";
import { getAcknowledgedDeliveryAgreementAmount } from "../delivery-preview";

export function DraftRentalFinancialSummary({
	preview,
	isFetching,
	equipmentAction,
	deliveryAction,
	deliveryDetails,
	showDelivery,
	staffArranged,
	hasEquipmentAdjustment,
	children,
}: {
	preview: PreviewDraftRentalCostResponseDto | undefined;
	isFetching: boolean;
	equipmentAction?: ReactNode;
	deliveryAction?: ReactNode;
	deliveryDetails?: ReactNode;
	showDelivery: boolean;
	staffArranged: boolean;
	hasEquipmentAdjustment: boolean;
	children?: ReactNode;
}) {
	const currency = preview?.currency ?? "USD";
	const deliveryCurrency = preview?.delivery?.currency ?? currency;
	const adjustment = preview?.pricing.targetTotalAdjustment;
	const delivery = preview?.delivery;
	const agreedAmount = getAcknowledgedDeliveryAgreementAmount(delivery);
	const deliveryAmount = agreedAmount ?? delivery?.effectiveCharge;
	const pendingExplanation =
		preview?.customerTotal != null || isFetching
			? null
			: staffArranged
				? "Configurá la entrega personalizada para calcular el total final."
				: agreedAmount !== null
					? "El precio manual está definido. Falta validar el transporte para calcular el total final."
					: delivery?.technicalFailure
						? "Revisá las condiciones de transporte para calcular el total final."
						: delivery?.effectiveCharge === null
							? "Revisá los requisitos de precio y transporte para calcular el total final."
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
							action={!hasEquipmentAdjustment ? equipmentAction : undefined}
						/>
						{hasEquipmentAdjustment ? (
							<SummaryRow
								label="Ajuste manual"
								value={
									adjustment
										? `${adjustment.direction === "DECREASE" ? "-" : adjustment.direction === "INCREASE" ? "+" : ""}${money(adjustment.adjustmentTotal)}`
										: "Pendiente"
								}
								action={equipmentAction}
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
					{showDelivery ? (
						<div className="mt-4 space-y-1.5 border-t pt-4">
							<SummaryRow
								label="Entrega y retiro"
								value={
									deliveryAmount == null
										? "Por definir"
										: money(deliveryAmount, deliveryCurrency)
								}
								action={deliveryAction}
							/>
							{agreedAmount !== null ? (
								<p className="text-muted-foreground text-xs">
									{delivery?.arrangement === "STAFF_ARRANGED" &&
									delivery.source === "PROPOSED"
										? "Importe propuesto"
										: "Importe acordado"}
								</p>
							) : (
								<p className="text-muted-foreground text-xs">
									{!preview
										? isFetching
											? "Calculando el costo del envío..."
											: "Completá los datos para consultar el costo del envío."
										: staffArranged
											? "Definí el importe acordado y el margen para transporte."
											: delivery?.effectiveCharge != null
												? "Precio calculado automáticamente"
												: "No se pudo calcular automáticamente. Podés acordar un importe manual."}
								</p>
							)}
							{deliveryDetails}
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
							<Loader2 className="size-3 animate-spin" /> Calculando...
						</p>
					) : null}
				</div>
				{children}
			</CardContent>
		</Card>
	);
}

function SummaryRow({
	label,
	value,
	strong,
	action,
}: {
	label: string;
	value: string;
	strong?: boolean;
	action?: ReactNode;
}) {
	return (
		<div
			className={
				strong
					? "grid grid-cols-[minmax(0,1fr)_max-content] items-baseline gap-x-3 text-sm"
					: "grid min-h-8 grid-cols-[minmax(0,1fr)_max-content_4.25rem] items-center gap-x-2 text-sm"
			}
		>
			<span
				className={strong ? "font-semibold text-base" : "text-muted-foreground"}
			>
				{label}
			</span>
			<span
				className={
					strong
						? "text-right font-semibold text-2xl tabular-nums tracking-tight"
						: "text-right font-medium tabular-nums"
				}
			>
				{value}
			</span>
			{!strong ? <div className="w-17">{action}</div> : null}
		</div>
	);
}
