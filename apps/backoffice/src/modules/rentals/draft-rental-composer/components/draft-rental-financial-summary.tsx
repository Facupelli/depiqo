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
	equipmentPreview,
	isFetching,
	equipmentAction,
	deliveryAction,
	deliveryDetails,
	showDelivery,
	staffArranged,
	deliveryAmountProposed,
	hasEquipmentAdjustment,
	children,
}: {
	preview: PreviewDraftRentalCostResponseDto | undefined;
	equipmentPreview:
		| Pick<PreviewDraftRentalCostResponseDto, "pricing" | "currency">
		| undefined;
	isFetching: boolean;
	equipmentAction?: ReactNode;
	deliveryAction?: ReactNode;
	deliveryDetails?: ReactNode;
	showDelivery: boolean;
	staffArranged: boolean;
	deliveryAmountProposed: boolean;
	hasEquipmentAdjustment: boolean;
	children?: ReactNode;
}) {
	const currency = equipmentPreview?.currency ?? "USD";
	const pricing = equipmentPreview?.pricing;
	const deliveryUnconfigured =
		showDelivery &&
		(!preview ||
			Boolean(preview.pendingDelivery) ||
			(preview.delivery?.arrangement === "ROUTED" &&
				preview.delivery.requirements.includes("DESTINATION_REQUIRED")));
	const deliveryCurrency = preview?.delivery?.currency ?? currency;
	const adjustment = pricing?.targetTotalAdjustment;
	const delivery = preview?.delivery;
	const agreedAmount = getAcknowledgedDeliveryAgreementAmount(delivery);
	const deliveryAmount = agreedAmount ?? delivery?.effectiveCharge;
	const pendingExplanation =
		preview?.customerTotal != null || isFetching
			? null
			: deliveryUnconfigured && equipmentPreview
				? "Configurá la entrega para consultar el total."
				: staffArranged
					? "Completá las condiciones del envío a medida para consultar el total."
					: agreedAmount !== null
						? "El importe está definido. Falta validar el envío para consultar el total."
						: delivery?.technicalFailure
							? "Revisá las condiciones de envío para consultar el total."
							: delivery?.effectiveCharge === null
								? "Completá el importe y las condiciones de envío para consultar el total."
								: "Completá los datos del alquiler para consultar el total.";
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
							value={money(pricing?.calculated.total)}
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
								value={money(pricing?.final.total)}
								emphasis
							/>
						) : null}
						{pricing?.insurance.applied ? (
							<SummaryRow
								label="Seguro"
								value={money(pricing.insurance.amount)}
							/>
						) : null}
					</div>
					{showDelivery ? (
						<div className="mt-3 space-y-2 border-t pt-3">
							{pricing ? (
								<SummaryRow
									label="Subtotal sin entrega y retiro"
									value={money(pricing.total)}
									emphasis
								/>
							) : null}
							<SummaryRow
								label="Entrega y retiro"
								value={
									deliveryAmount == null
										? deliveryUnconfigured
											? "Sin configurar"
											: "Por definir"
										: money(deliveryAmount, deliveryCurrency)
								}
								action={deliveryAction}
							/>
							{agreedAmount !== null ? (
								<p className="text-muted-foreground text-xs">
									{deliveryAmountProposed
										? "Importe propuesto"
										: "Importe definido"}
								</p>
							) : (
								<p className="text-muted-foreground text-xs">
									{!preview
										? isFetching
											? staffArranged
												? "Actualizando el total..."
												: "Calculando entrega y retiro..."
											: staffArranged
												? "Completá los datos para consultar el total."
												: "Completá los datos para consultar el precio de entrega y retiro."
										: deliveryUnconfigured
											? "Completá la configuración de entrega y retiro."
											: staffArranged
												? "Definí el importe y el tiempo para transporte."
												: delivery?.effectiveCharge != null
													? "Precio calculado"
													: "No hay un precio calculado disponible. Podés definir un importe; el envío debe poder validarse."}
								</p>
							)}
							{deliveryDetails}
						</div>
					) : null}
					<div className="my-4 border-t" />
					<SummaryRow
						label="Total del alquiler"
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
							<Loader2 className="size-3 animate-spin" /> Actualizando...
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
	emphasis,
	action,
}: {
	label: string;
	value: string;
	strong?: boolean;
	emphasis?: boolean;
	action?: ReactNode;
}) {
	return (
		<div
			className={
				strong
					? "grid grid-cols-[minmax(0,1fr)_max-content] items-baseline gap-x-3 text-sm"
					: "grid min-h-6 grid-cols-[minmax(0,1fr)_max-content_4.25rem] items-center gap-x-2 text-sm"
			}
		>
			<span
				className={
					strong
						? "font-semibold text-base"
						: emphasis
							? "font-medium"
							: "text-muted-foreground"
				}
			>
				{label}
			</span>
			<span
				className={
					strong
						? "text-right font-semibold text-2xl tabular-nums tracking-tight"
						: emphasis
							? "text-right font-semibold tabular-nums"
							: "text-right font-medium tabular-nums"
				}
			>
				{value}
			</span>
			{!strong ? <div className="w-17">{action}</div> : null}
		</div>
	);
}
