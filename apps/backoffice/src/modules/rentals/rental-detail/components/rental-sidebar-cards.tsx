import { Link } from "@tanstack/react-router";
import {
	ChevronDown,
	ExternalLink,
	Mail,
	MapPin,
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
import type { GetRentalDetailViewResponseDto } from "../get-rental-detail-view/get-rental-detail-view.schema";
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
			action={
				customer ? (
					<Link
						to="/dashboard/customers/$customerId"
						params={{ customerId: customer.id }}
						className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-950 transition-colors"
					>
						Ver Perfil
						<ExternalLink className="w-3 h-3" />
					</Link>
				) : null
			}
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
	const delivery = rental.fulfillment.deliveryDetails;
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
			<div className="border-t border-neutral-100 pt-3">
				<p className="text-xs text-neutral-400 mb-1.5">
					{rental.fulfillment.method === "DELIVERY"
						? "Solicitó delivery"
						: "Retiro en punto de entrega"}
				</p>
				<div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
					<MapPin className="size-3.5 text-neutral-400 shrink-0" />
					{branch?.name ?? "Sucursal no encontrada"}
				</div>
			</div>
			{delivery ? (
				<div className="border-t border-neutral-100 mt-3 pt-3">
					<p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-2">
						Pedido de Delivery
					</p>
					<div className="space-y-1 text-sm text-neutral-700">
						{delivery.contactName && (
							<p className="font-medium text-neutral-900">
								{delivery.contactName}
							</p>
						)}
						{delivery.contactPhone ? <p>{delivery.contactPhone}</p> : null}
						<p>
							{delivery.addressLine1}
							{delivery.addressLine2 ? `, ${delivery.addressLine2}` : ""}
						</p>
						<p>
							{[delivery.city, delivery.state, delivery.postalCode]
								.filter(Boolean)
								.join(", ")}
						</p>
						{delivery.country ? <p>{delivery.country}</p> : null}
						{delivery.notes ? (
							<p className="text-neutral-500 pt-1">{delivery.notes}</p>
						) : null}
					</div>
				</div>
			) : null}
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

	const pricing = rental.pricing;
	const manualAdjustment = pricing?.manualPricingAdjustment ?? null;

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

	if (pricing.kind === "LEGACY") {
		return <RentalLegacyFinancialsCard pricing={pricing} />;
	}

	return (
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
					{formatMoney(pricing.total, pricing.currency)}
				</span>
			</div>
			<div className="border-t border-dashed border-neutral-200 pt-3 space-y-2">
				<MoneyRow
					label="Subtotal"
					value={pricing.subtotal}
					currency={pricing.currency}
				/>
				{pricing.discountTotal !== "0" ? (
					<MoneyRow
						label="Descuentos"
						value={pricing.discountTotal}
						currency={pricing.currency}
						tone="success"
						prefix="-"
					/>
				) : null}
				{manualAdjustment ? (
					<ManualAdjustmentRow
						label="Ajuste manual"
						amount={manualAdjustment.adjustmentTotal}
						direction={manualAdjustment.direction}
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
				{manualAdjustment?.reason ? (
					<div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
						<span className="font-semibold">Motivo: </span>
						{manualAdjustment.reason}
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
				</div>
			) : null}
		</section>
	);
}

function RentalLegacyFinancialsCard({
	pricing,
}: {
	pricing: Extract<
		NonNullable<GetRentalDetailViewResponseDto["pricing"]>,
		{ kind: "LEGACY" }
	>;
}) {
	const [showItems, setShowItems] = useState(false);
	const hasDiscounts = Number(pricing.discountTotal) !== 0;

	return (
		<section className="bg-white border border-neutral-200 rounded-lg p-5">
			<button
				type="button"
				onClick={() => setShowItems((previous) => !previous)}
				className="flex w-full items-start justify-between gap-4 text-left"
			>
				<div>
					<SidebarHeader
						icon={<ReceiptText className="size-4" />}
						title="Resumen financiero"
					/>
					<p className="text-xs text-neutral-500">Resumen histórico</p>
				</div>
				<ChevronDown
					className={`size-4 transition-transform text-neutral-400 ${showItems ? "rotate-180" : ""}`}
				/>
			</button>
			<div className="flex items-baseline justify-between pt-3 pb-3">
				<span className="text-sm font-bold text-neutral-950">Total</span>
				<span className="font-mono text-xl font-bold text-neutral-950 tracking-tight">
					{formatMoney(pricing.total, pricing.currency)}
				</span>
			</div>
			<div className="border-t border-dashed border-neutral-200 pt-3 space-y-2">
				<MoneyRow
					label="Subtotal antes de descuentos"
					value={pricing.subtotalBeforeDiscounts}
					currency={pricing.currency}
				/>
				{hasDiscounts ? (
					<MoneyRow
						label="Descuentos"
						value={pricing.discountTotal}
						currency={pricing.currency}
						tone="success"
					/>
				) : null}
				{pricing.insuranceApplied ? (
					<MoneyRow
						label="Seguro de equipos"
						value={pricing.insuranceAmount}
						currency={pricing.currency}
					/>
				) : null}
			</div>
			{showItems ? (
				<div className="border-t border-neutral-100 mt-3 pt-3">
					{pricing.lines.map((line) => (
						<div
							key={line.rentalSelectionId}
							className="border-b border-neutral-100 py-2"
						>
							<div className="flex items-center justify-between gap-3">
								<span className="text-sm text-neutral-500">{line.label}</span>
								<span className="font-mono text-sm text-neutral-950">
									{formatMoney(line.finalPrice, pricing.currency)}
								</span>
							</div>
							{line.discounts.map((discount) => (
								<div
									key={`${discount.label}-${discount.amount}`}
									className="flex items-center justify-between pl-3"
								>
									<span className="text-[11px] text-neutral-400">
										{discount.label}
									</span>
									<span className="font-mono text-[11px] text-emerald-600">
										{formatMoney(discount.amount, pricing.currency)}
									</span>
								</div>
							))}
						</div>
					))}
				</div>
			) : null}
		</section>
	);
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
