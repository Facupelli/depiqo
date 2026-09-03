import { Button } from "@repo/ui/components/button";
import {
	ChevronDown,
	Mail,
	MapPin,
	Pencil,
	Phone,
	ReceiptText,
	Truck,
	User2Icon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useBranchDetail } from "@/modules/settings/branches/public";
import { useBranchTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { formatMoney } from "@/shared/utils/formatters";
import { AssignCustomerToDraftRentalDialog } from "../assign-customer/assign-customer-to-draft-rental-dialog";
import { RentalContractSigningCard } from "../documents/signing/rental-contract-signing-card";
import {
	isZeroDecimal,
	normalizeDecimal,
	parsePlainDecimal,
} from "../edit-price-adjustment/decimal-string";
import { EditPriceAdjustmentDialog } from "../edit-price-adjustment/edit-price-adjustment-dialog";
import { useRentalDetailContext } from "../rental-detail.context";
import {
	formatRentalDetailDateBlock,
	getRentalCustomerInitials,
} from "../rental-detail.utils";

export function RentalSidebarCards() {
	return (
		<div className="space-y-4">
			<RentalClientCard />
			<RentalContractSigningCard />
			<RentalLogisticsCard />
			<RentalFinancialsCard />
		</div>
	);
}

function RentalClientCard() {
	const {
		rental,
		customerSummary,
		isCustomerSummaryLoading,
		isCustomerSummaryError,
	} = useRentalDetailContext();
	const customer = customerSummary;
	const hasLinkedCustomer = rental.customerId !== null;
	const canAssignCustomer = !hasLinkedCustomer && rental.status === "DRAFT";

	return (
		<SidebarCard
			icon={<User2Icon className="size-4" />}
			title="Información del cliente"
		>
			{customer ? (
				<>
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
							<span className="text-sm font-bold text-neutral-600">
								{getRentalCustomerInitials(customer.displayName)}
							</span>
						</div>
						<p className="text-sm font-bold text-neutral-950 leading-tight">
							{customer.displayName}
						</p>
					</div>
					<div className="space-y-2.5">
						<SidebarField
							icon={<Mail className="w-3.5 h-3.5" />}
							value={customer.email}
						/>
						{customer.phone ? (
							<SidebarField
								icon={<Phone className="w-3.5 h-3.5" />}
								value={customer.phone}
							/>
						) : null}
					</div>
				</>
			) : isCustomerSummaryLoading && hasLinkedCustomer ? (
				<p className="text-sm text-neutral-500">Cargando cliente...</p>
			) : isCustomerSummaryError && hasLinkedCustomer ? (
				<div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3">
					<p className="text-sm font-semibold text-amber-950">
						Cliente no encontrado
					</p>
					<p className="text-xs text-amber-900">
						El pedido tiene un cliente vinculado, pero no pudimos cargar su
						resumen.
					</p>
				</div>
			) : canAssignCustomer ? (
				<div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
					<p className="text-xs text-amber-900">
						Este borrador todavía no tiene un cliente vinculado.
					</p>
					<AssignCustomerToDraftRentalDialog />
				</div>
			) : (
				<p className="text-sm text-amber-900">
					Todavía no hay un cliente vinculado.
				</p>
			)}
		</SidebarCard>
	);
}

function RentalLogisticsCard() {
	const { rental } = useRentalDetailContext();
	const acceptedDelivery = rental.acceptedDelivery;
	const { data: branch, isLoading: isBranchLoading } = useBranchDetail(
		rental.branchId,
	);
	const timezone = useBranchTimezone(rental.branchId);

	return (
		<SidebarCard icon={<Truck className="size-4" />} title="Logística">
			<div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-4">
				{isBranchLoading ? (
					<>
						<DateBlockSkeleton label="Fecha de retiro" />
						<DateBlockSkeleton label="Fecha de devolución" />
					</>
				) : (
					<>
						<DateBlock
							label="Fecha de retiro"
							value={rental.period.start}
							timezone={timezone}
						/>
						<DateBlock
							label="Fecha de devolución"
							value={rental.period.end}
							timezone={timezone}
						/>
					</>
				)}
			</div>
			<div className="border-t border-neutral-100">
		  	{acceptedDelivery ? (
					<div className="mt-3">
						<p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
							Pedido de delivery
						</p>
						<p className="text-sm text-neutral-700">
							{acceptedDelivery.resolvedCustomerLocation.formattedAddress}
						</p>
					</div>
				) : null}
			</div>
		</SidebarCard>
	);
}

function DateBlock({
	label,
	value,
	timezone,
}: {
	label: string;
	value: string;
	timezone: string;
}) {
	const { date, time } = formatRentalDetailDateBlock(value, timezone);
	return (
		<div>
			<p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">
				{label}
			</p>
			<p className="text-sm font-medium text-neutral-900">
				{date}
				<span className="text-neutral-400 mx-1">·</span>
				{time}
			</p>
		</div>
	);
}

function DateBlockSkeleton({ label }: { label: string }) {
	return (
		<div>
			<p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">
				{label}
			</p>
			<p className="text-sm font-medium text-neutral-400">Cargando...</p>
		</div>
	);
}

function RentalFinancialsCard() {
	const { rental } = useRentalDetailContext();
	const [showItems, setShowItems] = useState(false);
	const [isEditPriceDialogOpen, setIsEditPriceDialogOpen] = useState(false);

	const pricing = rental.pricing;

	if (!pricing) {
		return (
			<SidebarCard
				icon={<ReceiptText className="size-4" />}
				title="Resumen financiero"
			>
				<p className="text-sm text-neutral-500">Sin precio calculado.</p>
			</SidebarCard>
		);
	}

	const acceptedDelivery = rental.acceptedDelivery;
	const headlineTotal = acceptedDelivery
		? (rental.acceptedCustomerTotal ?? pricing.total)
		: pricing.total;
	const manualAdjustment = pricing.manualPricingAdjustment ?? null;
	const canEditPrice =
		rental.status === "CONFIRMED" && Date.now() < Date.parse(rental.period.end);
	const adjustmentSign =
		manualAdjustment?.direction === "INCREASE"
			? "+"
			: manualAdjustment?.direction === "DECREASE"
				? "-"
				: "";

	return (
		<>
			<EditPriceAdjustmentDialog
				open={isEditPriceDialogOpen}
				onOpenChange={setIsEditPriceDialogOpen}
			/>
			<section className="bg-white border border-neutral-200 rounded-lg p-5">
				<button
					type="button"
					onClick={() => setShowItems((prev) => !prev)}
					className="flex w-full items-start justify-between gap-4 text-left"
				>
					<SidebarHeader
						icon={<ReceiptText className="size-4" />}
						title="Resumen financiero"
					/>
					<ChevronDown
						className={`size-4 transition-transform text-neutral-400 ${showItems ? "rotate-180" : ""}`}
					/>
				</button>
				<div className="flex items-baseline justify-between pt-3 pb-3">
					<span className="text-sm font-bold text-neutral-950">Total</span>
					<span className="font-mono text-xl font-bold text-neutral-950 tracking-tight">
						{formatMoney(headlineTotal, pricing.currency)}
					</span>
				</div>
				<div className="border-t border-dashed border-neutral-200 pt-3 space-y-2">
					<MoneyRow
						label="Subtotal"
						value={pricing.subtotal}
						currency={pricing.currency}
					/>
					{!isZeroDecimal(pricing.discountTotal) ? (
						<MoneyRow
							label="Descuentos"
							value={pricing.discountTotal}
							currency={pricing.currency}
							tone="success"
							prefix="-"
						/>
					) : null}
					{acceptedDelivery ? (
						<MoneyRow
							label="Delivery"
							value={acceptedDelivery.deliveryTotal}
							currency={acceptedDelivery.currency}
						/>
					) : null}
					<div>
						<div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
							<span className="text-sm text-neutral-500">Ajuste manual</span>
							<span className="font-mono text-sm text-neutral-950">
								{manualAdjustment
									? `${adjustmentSign}${formatMoney(manualAdjustment.adjustmentTotal, pricing.currency)}`
									: "Sin ajuste"}
							</span>
							{canEditPrice ? (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-7 px-2"
									onClick={() => setIsEditPriceDialogOpen(true)}
								>
									<Pencil className="size-3.5" />
									{manualAdjustment ? "Editar" : "Agregar"}
								</Button>
							) : null}
						</div>
						{manualAdjustment?.reason ? (
							<p className="mt-1 pl-2 text-xs text-neutral-500">
								<span className="font-medium">Motivo: </span>
								{manualAdjustment.reason}
							</p>
						) : null}
					</div>
					{pricing.insurance.applied ? (
						<MoneyRow
							label="Seguro de equipos"
							value={pricing.insurance.amount}
							currency={pricing.currency}
						/>
					) : null}
					<div className="flex items-center justify-between">
						<span className="text-sm text-neutral-500">Días cobrados</span>
						<span className="font-mono text-sm text-neutral-950">
							{pricing.chargedDays}
						</span>
					</div>
					{pricing.appliedCoupon ? (
						<div className="flex items-center justify-between">
							<span className="text-sm text-neutral-500">Cupón</span>
							<span className="font-mono text-sm text-neutral-950">
								{pricing.appliedCoupon.code}
							</span>
						</div>
					) : null}
				</div>
				{showItems ? (
					<div className="border-t border-neutral-100 mt-3 pt-3">
						{pricing.lines.map((line) => (
							<div
								key={`${line.rentalOfferId}-${line.rentableItemId}`}
								className="border-b border-neutral-100 py-2"
							>
								<div className="flex items-center justify-between">
									<span className="text-sm text-neutral-500">
										{line.rentableItemName} ×{line.quantity}
									</span>
									<span className="font-mono text-sm text-neutral-950">
										{formatMoney(line.total, pricing.currency)}
									</span>
								</div>
								{line.appliedAdjustments.map((adjustment) => (
									<div
										key={`${adjustment.promotionId}-${adjustment.name}`}
										className="flex items-center justify-between pl-3"
									>
										<span className="text-[11px] text-neutral-400">
											{adjustment.name}
										</span>
										<span className="font-mono text-[11px] text-emerald-600">
											-{formatMoney(adjustment.amount, pricing.currency)}
										</span>
									</div>
								))}
								{line.manualPricingAdjustment ? (
									<ManualAdjustmentRow
										label="Ajuste asignado"
										amount={line.manualPricingAdjustment.amount}
										direction={line.manualPricingAdjustment.direction}
										currency={pricing.currency}
										compact
									/>
								) : null}
							</div>
						))}
						<OwnerPayoutsSection />
					</div>
				) : null}
			</section>
		</>
	);
}

function OwnerPayoutsSection() {
	const { rental } = useRentalDetailContext();
	const payouts = rental.ownerPayouts;
	if (payouts.length === 0) return null;

	const currency = payouts[0]?.currency ?? "";
	const total = sumDecimalStrings(payouts.map((payout) => payout.total));

	return (
		<div className="mt-4 border-t border-neutral-200 pt-4">
			<div className="rounded-lg bg-neutral-50 px-3.5 py-3">
				<h3 className="mb-3 text-xs font-semibold text-neutral-700">
					Pagos a propietarios
				</h3>
				<div className="space-y-3">
					{payouts.map((payout) => (
						<div key={payout.ownerId}>
							<div className="flex items-baseline justify-between gap-3">
								<span className="text-sm font-medium text-neutral-800">
									{payout.ownerName}
								</span>
								<span className="font-mono text-sm text-neutral-800">
									{formatMoney(payout.total, payout.currency)}
								</span>
							</div>
							<div className="mt-1 space-y-0.5 pl-2">
								{payout.lines.map((line) => (
									<p
										key={line.rentalDemandLineId}
										className="text-xs text-neutral-500"
									>
										{line.equipmentName} × {line.quantity}
									</p>
								))}
							</div>
						</div>
					))}
				</div>
				<div className="mt-3 flex items-center justify-between gap-3 border-t border-neutral-200 pt-3">
					<span className="text-sm font-semibold text-neutral-800">
						Total a propietarios
					</span>
					<span className="font-mono text-sm font-semibold text-neutral-900">
						{formatMoney(total, currency)}
					</span>
				</div>
			</div>
		</div>
	);
}

function sumDecimalStrings(values: string[]): string {
	const parsed = values.map(parsePlainDecimal);
	if (parsed.some((value) => value === null)) {
		throw new Error("Invalid owner payout amount.");
	}

	const decimals = parsed.filter((value) => value !== null);
	const scale = Math.max(0, ...decimals.map((value) => value.scale));
	const units = decimals.reduce(
		(total, value) => total + value.units * 10n ** BigInt(scale - value.scale),
		0n,
	);

	return normalizeDecimal({ units, scale });
}

function MoneyRow({
	label,
	value,
	currency,
	tone = "default",
	prefix = "",
}: {
	label: string;
	value: string;
	currency: string;
	tone?: "default" | "success";
	prefix?: string;
}) {
	return (
		<div className="flex items-center justify-between">
			<span
				className={
					tone === "success"
						? "text-sm text-green-700"
						: "text-sm text-neutral-500"
				}
			>
				{label}
			</span>
			<span
				className={
					tone === "success"
						? "font-mono text-sm font-semibold text-green-700"
						: "font-mono text-sm text-neutral-950"
				}
			>
				{prefix}
				{formatMoney(value, currency)}
			</span>
		</div>
	);
}

function ManualAdjustmentRow({
	label,
	amount,
	direction,
	currency,
	compact = false,
}: {
	label: string;
	amount: string;
	direction: "INCREASE" | "DECREASE" | "NONE";
	currency: string;
	compact?: boolean;
}) {
	const sign =
		direction === "INCREASE" ? "+" : direction === "DECREASE" ? "-" : "";
	const valueClassName =
		direction === "INCREASE"
			? "text-amber-700"
			: direction === "DECREASE"
				? "text-emerald-600"
				: "text-neutral-500";

	return (
		<div
			className={`flex items-center justify-between ${compact ? "pl-3" : ""}`}
		>
			<span
				className={
					compact ? "text-[11px] text-neutral-400" : "text-sm text-amber-700"
				}
			>
				{label}
			</span>
			<span
				className={`${compact ? "text-[11px]" : "text-sm font-semibold"} font-mono ${valueClassName}`}
			>
				{sign}
				{formatMoney(amount, currency)}
			</span>
		</div>
	);
}

function SidebarCard({
	icon,
	title,
	action,
	children,
}: {
	icon: ReactNode;
	title: string;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="bg-white border border-neutral-200 rounded-lg p-5">
			<SidebarHeader icon={icon} title={title} action={action} />
			{children}
		</section>
	);
}

function SidebarHeader({
	icon,
	title,
	action,
}: {
	icon: ReactNode;
	title: string;
	action?: ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-3 border-b border-neutral-100 mb-3 pb-1">
			<div className="flex items-center gap-2">
				<span className="flex size-8 items-center justify-center text-neutral-600">
					{icon}
				</span>
				<h2 className="text-sm font-bold text-neutral-950">{title}</h2>
			</div>
			{action}
		</div>
	);
}

function SidebarField({ icon, value }: { icon: ReactNode; value: string }) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-neutral-400 shrink-0">{icon}</span>
			<span className="text-xs text-neutral-500">{value}</span>
		</div>
	);
}
