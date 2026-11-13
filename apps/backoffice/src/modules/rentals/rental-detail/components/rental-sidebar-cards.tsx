import { TenantPermission } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import {
	CalendarDays,
	ChevronDown,
	Pencil,
	ReceiptText,
	Truck,
	User2Icon,
} from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { can } from "@/auth/permissions";
import { CardHeaderIcon } from "@/components/card-header-icon";
import { RentalInvoicesCard } from "@/modules/invoicing/public";
import { useBranchTimezone } from "@/shared/timezone/operational-timezone.hooks";
import {
	isZeroDecimal,
	sumDecimalStrings,
} from "@/shared/utils/decimal-string";
import { formatMoney } from "@/shared/utils/formatters";
import { AssignCustomerToDraftRentalDialog } from "../assign-customer/assign-customer-to-draft-rental-dialog";
import { RentalContractSigningCard } from "../documents/signing/rental-contract-signing-card";
import { EditDeliveryDialog } from "../edit-delivery/edit-delivery-dialog";
import { EditDeliveryAgreementDialog } from "../edit-delivery-agreement/edit-delivery-agreement-dialog";
import { EditPriceAdjustmentDialog } from "../edit-price-adjustment/edit-price-adjustment-dialog";
import { useRentalDetailContext } from "../rental-detail.context";
import { rentalDetailViewQueries } from "../rental-detail.queries";
import {
	formatRentalDetailDateBlock,
	getRentalCustomerInitials,
	getRentalDetailFinancialSummary,
} from "../rental-detail.utils";

type PeriodEditAction = {
	onOpen: () => void;
};

export function RentalSidebarCards({
	periodEditAction,
}: {
	periodEditAction?: PeriodEditAction;
}) {
	const { rental, permissions } = useRentalDetailContext();
	const queryClient = useQueryClient();
	const canReadContracts = can(permissions, TenantPermission.ContractsRead);
	const canAccessInvoices =
		can(permissions, TenantPermission.InvoicingRead) ||
		can(permissions, TenantPermission.InvoicingManage);
	const invoiceRegistrationEligible =
		rental.status === "CONFIRMED" ||
		rental.status === "COMPLETED" ||
		(rental.status === "CANCELLED" && rental.confirmedAt !== null);

	return (
		<div className="flex flex-col gap-3">
			<div className="order-1 @5xl/rental-detail:order-2">
				<RentalClientCard />
			</div>
			{canReadContracts ? (
				<div className="order-2 @5xl/rental-detail:order-3">
					<RentalContractSigningCard />
				</div>
			) : null}
			<div className="order-3 @5xl/rental-detail:order-1">
				<RentalLogisticsCard periodEditAction={periodEditAction} />
			</div>
			<div className="order-4">
				<RentalFinancialsCard />
			</div>
			{canAccessInvoices ? (
				<div className="order-5">
					<RentalInvoicesCard
						rentalId={rental.id}
						permissions={permissions}
						acceptedCustomerTotal={rental.acceptedCustomerTotal}
						currency={rental.pricing?.currency ?? null}
						registrationEligible={invoiceRegistrationEligible}
						onRentalContextStale={async () => {
							await queryClient.fetchQuery(
								rentalDetailViewQueries.detail(rental.id, { staleTime: 0 }),
							);
						}}
					/>
				</div>
			) : null}
		</div>
	);
}

function RentalClientCard() {
	const {
		rental,
		permissions,
		customerSummary,
		isCustomerSummaryLoading,
		isCustomerSummaryError,
	} = useRentalDetailContext();
	const customer = customerSummary;
	const canAssignCustomer = can(
		permissions,
		TenantPermission.RentalsProposalsManage,
	);
	const hasLinkedCustomer = rental.customerId !== null;
	const summary = customer
		? customer.displayName
		: isCustomerSummaryLoading && hasLinkedCustomer
			? "Cargando cliente..."
			: isCustomerSummaryError && hasLinkedCustomer
				? "Cliente no encontrado"
				: "Sin cliente asignado";

	return (
		<ResponsiveDisclosureCard
			icon={<User2Icon className="size-4" />}
			title="Cliente"
			summary={summary}
		>
			{customer ? (
				<div className="flex items-center gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-200">
						<span className="text-sm font-bold text-neutral-600">
							{getRentalCustomerInitials(customer.displayName)}
						</span>
					</div>
					<div className="min-w-0">
						<p className="text-sm font-bold leading-tight text-neutral-950">
							{customer.displayName}
						</p>
						<p className="mt-0.5 min-w-0 break-words text-xs text-neutral-500">
							{customer.email}
						</p>
						{customer.phone ? (
							<p className="mt-0.5 min-w-0 break-words text-xs text-neutral-500">
								{customer.phone}
							</p>
						) : null}
					</div>
				</div>
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
				<AssignCustomerToDraftRentalDialog
					renderTrigger={(trigger) => (
						<div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
							<p className="text-xs text-amber-900">
								Este borrador todavía no tiene un cliente vinculado.
							</p>
							{trigger}
						</div>
					)}
					unavailableFallback={
						<p className="text-sm text-amber-900">
							Todavía no hay un cliente vinculado.
						</p>
					}
				/>
			) : (
				<p className="text-sm text-amber-900">
					Todavía no hay un cliente vinculado.
				</p>
			)}
		</ResponsiveDisclosureCard>
	);
}

function RentalLogisticsCard({
	periodEditAction,
}: {
	periodEditAction?: PeriodEditAction;
}) {
	const { rental, permissions } = useRentalDetailContext();
	const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
	const canEditDelivery =
		can(permissions, TenantPermission.RentalsDeliveryManage) &&
		rental.status === "CONFIRMED" &&
		rental.fulfillment.method === "DELIVERY" &&
		Date.now() < Date.parse(rental.period.start);
	const deliveryDetails = rental.fulfillment.deliveryDetails;
	const timezone = useBranchTimezone(rental.branchId);
	const pickup = formatRentalDetailDateBlock(rental.period.start, timezone);
	const returnDate = formatRentalDetailDateBlock(rental.period.end, timezone);

	return (
		<>
			{isDeliveryOpen ? (
				<EditDeliveryDialog onClose={() => setIsDeliveryOpen(false)} />
			) : null}
			<ResponsiveDisclosureCard
				icon={<Truck className="size-4" />}
				title="Logística"
				summary={`${pickup.date} ${pickup.time} → ${returnDate.date} ${returnDate.time}`}
				headerAction={
					periodEditAction ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="shrink-0 text-neutral-500 hover:text-neutral-950"
							onClick={periodEditAction.onOpen}
							aria-label="Editar período"
							title="Editar período"
						>
							<Pencil className="size-3.5" />
						</Button>
					) : null
				}
			>
				<div className="grid grid-cols-2 gap-x-6 gap-y-1">
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
				</div>
				{canEditDelivery ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-3"
						onClick={() => setIsDeliveryOpen(true)}
					>
						<Pencil className="size-3.5" />
						Editar entrega
					</Button>
				) : null}
				{deliveryDetails ? (
					<div className="mt-3 border-t border-neutral-100">
						<p className="mt-3 mb-1 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
							{(rental.acceptedDelivery ?? rental.draftDelivery)
								?.arrangement === "STAFF_ARRANGED"
								? "Entrega coordinada por el equipo"
								: "Pedido de delivery"}
						</p>
						<p className="text-sm text-neutral-700">
							{deliveryDetails.formattedAddress ?? deliveryDetails.address}
						</p>
					</div>
				) : null}
			</ResponsiveDisclosureCard>
		</>
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

function RentalFinancialsCard() {
	const { rental, permissions } = useRentalDetailContext();
	const canAdjustPrice = can(
		permissions,
		TenantPermission.RentalsPriceAdjustmentManage,
	);
	const [showItems, setShowItems] = useState(false);
	const [isEditPriceDialogOpen, setIsEditPriceDialogOpen] = useState(false);
	const [isDeliveryAgreementOpen, setIsDeliveryAgreementOpen] = useState(false);
	const financialContentId = useId();

	const pricing = rental.pricing;

	if (!pricing) {
		return (
			<section className="rounded-lg border border-neutral-200 bg-white p-4">
				<div className="mb-4 flex items-center gap-3 border-b border-neutral-200 pb-4">
					<CardHeaderIcon>
						<ReceiptText />
					</CardHeaderIcon>
					<h2 className="text-base font-bold text-neutral-950">Importe</h2>
				</div>
				<p className="break-words text-sm text-neutral-500">
					Sin precio calculado.
				</p>
			</section>
		);
	}

	const acceptedDelivery = rental.acceptedDelivery;
	const { delivery, total: headlineTotal } = getRentalDetailFinancialSummary(
		rental,
		pricing,
	);
	const formattedTotal =
		headlineTotal === null
			? "Total no disponible"
			: formatMoney(headlineTotal, pricing.currency);
	const manualAdjustment = pricing.manualPricingAdjustment ?? null;
	const canEditPrice =
		canAdjustPrice &&
		rental.status === "CONFIRMED" &&
		Date.now() < Date.parse(rental.period.end);
	const canEditDelivery =
		can(permissions, TenantPermission.RentalsDeliveryManage) &&
		rental.status === "CONFIRMED" &&
		rental.fulfillment.method === "DELIVERY" &&
		acceptedDelivery !== null &&
		Date.now() < Date.parse(rental.period.end);
	const adjustmentSign =
		manualAdjustment?.direction === "INCREASE"
			? "+"
			: manualAdjustment?.direction === "DECREASE"
				? "-"
				: "";

	return (
		<>
			{isDeliveryAgreementOpen ? (
				<EditDeliveryAgreementDialog
					open
					onOpenChange={setIsDeliveryAgreementOpen}
				/>
			) : null}
			<EditPriceAdjustmentDialog
				open={isEditPriceDialogOpen}
				onOpenChange={setIsEditPriceDialogOpen}
			/>
			<section className="rounded-lg border border-neutral-200 bg-white p-4">
				<button
					type="button"
					onClick={() => setShowItems((prev) => !prev)}
					className="flex w-full min-w-0 items-center justify-between gap-3 border-b border-neutral-200 pb-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-controls={`${financialContentId} ${financialContentId}-items`}
					aria-expanded={showItems}
				>
					<CardHeaderIcon>
						<ReceiptText />
					</CardHeaderIcon>
					<h2 className="min-w-0 flex-1 text-base font-bold text-neutral-950">
						Importe
					</h2>
					<ChevronDown
						className={`size-4 shrink-0 text-neutral-400 transition-transform ${showItems ? "rotate-180" : ""}`}
					/>
				</button>
				<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-neutral-200 py-3">
					<span className="text-sm font-bold text-neutral-950">
						Total del alquiler
					</span>
					<span className="break-words font-mono text-xl font-bold tracking-tight text-neutral-950">
						{formattedTotal}
					</span>
				</div>
				<div className="space-y-2 pt-3">
					<div
						id={financialContentId}
						hidden={!showItems}
						className="space-y-2"
					>
						<MoneyRow
							label="Equipos"
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
						<div>
							<FinancialSummaryRow
								label={
									<span className="text-sm text-neutral-500">
										Ajuste manual
									</span>
								}
								amount={
									<span className="font-mono text-sm text-neutral-950">
										{manualAdjustment
											? `${adjustmentSign}${formatMoney(manualAdjustment.adjustmentTotal, pricing.currency)}`
											: "Sin ajuste"}
									</span>
								}
								action={
									canEditPrice ? (
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											className="size-5"
											aria-label={
												manualAdjustment
													? "Editar ajuste manual"
													: "Añadir ajuste manual"
											}
											title={
												manualAdjustment
													? "Editar ajuste manual"
													: "Añadir ajuste manual"
											}
											onClick={() => setIsEditPriceDialogOpen(true)}
										>
											<Pencil className="size-3.5" />
										</Button>
									) : null
								}
							/>
							{manualAdjustment?.reason ? (
								<p className="mt-1 text-xs text-neutral-500">
									Motivo: {manualAdjustment.reason}
								</p>
							) : null}
						</div>
					</div>
					<div className={showItems ? "border-b border-neutral-200 pb-3" : ""}>
						<FinancialSummaryRow
							label={
								<span className="text-sm text-neutral-950">
									Equipos a cobrar
								</span>
							}
							amount={
								<span className="font-mono text-sm text-neutral-950">
									{formatMoney(pricing.totalBeforeInsurance, pricing.currency)}
								</span>
							}
						/>
					</div>
					{pricing.insurance.applied ? (
						<MoneyRow
							label={showItems ? "Seguro de equipos" : "Seguro"}
							value={pricing.insurance.amount}
							currency={pricing.currency}
						/>
					) : null}
					{delivery ? (
						<MoneyRow
							label="Entrega y retiro"
							value={delivery.effectiveDeliveryCharge}
							currency={delivery.currency}
							action={
								canEditDelivery ? (
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										className="size-5"
										aria-label="Editar precio de entrega y retiro"
										title="Editar precio de entrega y retiro"
										onClick={() => setIsDeliveryAgreementOpen(true)}
									>
										<Pencil className="size-3.5" />
									</Button>
								) : null
							}
						/>
					) : rental.status === "DRAFT" &&
						rental.fulfillment.method === "DELIVERY" ? (
						<p className="text-sm text-neutral-500">
							Entrega y retiro: importe no disponible.
						</p>
					) : null}
					<div className="flex items-center gap-2 border-t border-neutral-200 pt-3 text-sm text-neutral-500">
						<CalendarDays className="size-4 shrink-0" />
						<span>
							{pricing.chargedDays}{" "}
							{pricing.chargedDays === 1 ? "día cobrado" : "días cobrados"}
						</span>
					</div>
					{showItems && pricing.appliedCoupon ? (
						<div className="flex items-center justify-between">
							<span className="text-sm text-neutral-500">Cupón</span>
							<span className="font-mono text-sm text-neutral-950">
								{pricing.appliedCoupon.code}
							</span>
						</div>
					) : null}
				</div>
				<div
					id={`${financialContentId}-items`}
					hidden={!showItems}
					className="mt-3 border-t border-neutral-200 pt-3"
				>
					<h3 className="mb-1 text-sm font-bold text-neutral-950">
						Detalle por equipo
					</h3>
					{pricing.lines.map((line) => (
						<div
							key={`${line.rentalOfferId}-${line.rentableItemId}`}
							className="space-y-1 border-b border-neutral-100 py-2 last:border-b-0 last:pb-0"
						>
							<div className="flex items-baseline justify-between gap-3">
								<span className="min-w-0 text-sm font-semibold text-neutral-950">
									{line.rentableItemName} ×{line.quantity}
								</span>
								<span className="shrink-0 font-mono text-sm font-semibold text-neutral-950">
									{formatMoney(line.total, pricing.currency)}
								</span>
							</div>
							<p className="pl-3 text-xs text-neutral-500">
								Tarifa registrada:{" "}
								{formatMoney(line.pricePerUnit, pricing.currency)}
							</p>
							{line.appliedAdjustments.map((adjustment) => (
								<div
									key={`${adjustment.promotionId}-${adjustment.name}`}
									className="flex items-baseline justify-between gap-3 pl-3"
								>
									<span className="text-xs text-neutral-500">
										{adjustment.name}
									</span>
									<span className="shrink-0 font-mono text-xs text-green-700">
										-{formatMoney(adjustment.amount, pricing.currency)}
									</span>
								</div>
							))}
							{line.manualPricingAdjustment ? (
								<ManualAdjustmentRow
									label="Ajuste manual asignado"
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

function FinancialSummaryRow({
	label,
	amount,
	action,
}: {
	label: ReactNode;
	amount: ReactNode;
	action?: ReactNode;
}) {
	return (
		<div className="grid min-h-5 grid-cols-[minmax(0,1fr)_auto_1.25rem] items-center gap-x-2">
			{label}
			{amount}
			<div className="flex size-5 items-center justify-center">{action}</div>
		</div>
	);
}

function MoneyRow({
	label,
	value,
	currency,
	tone = "default",
	prefix = "",
	action,
}: {
	label: string;
	value: string;
	currency: string;
	tone?: "default" | "success";
	prefix?: string;
	action?: ReactNode;
}) {
	return (
		<FinancialSummaryRow
			label={
				<span
					className={
						tone === "success"
							? "text-sm text-green-700"
							: "text-sm text-neutral-500"
					}
				>
					{label}
				</span>
			}
			amount={
				<span
					className={
						tone === "success"
							? "shrink-0 font-mono text-sm font-semibold text-green-700"
							: "shrink-0 font-mono text-sm text-neutral-950"
					}
				>
					{prefix}
					{formatMoney(value, currency)}
				</span>
			}
			action={action}
		/>
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
			className={`flex items-center justify-between gap-3 ${compact ? "pl-3" : ""}`}
		>
			<span
				className={
					compact ? "text-xs text-neutral-500" : "text-sm text-amber-700"
				}
			>
				{label}
			</span>
			<span
				className={`${compact ? "text-xs" : "text-sm font-semibold"} shrink-0 font-mono ${valueClassName}`}
			>
				{sign}
				{formatMoney(amount, currency)}
			</span>
		</div>
	);
}

function ResponsiveDisclosureCard({
	icon,
	title,
	summary,
	headerAction,
	children,
}: {
	icon: ReactNode;
	title: string;
	summary: string;
	headerAction?: ReactNode;
	children: ReactNode;
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const contentId = useId();
	const toggleExpanded = () => setIsExpanded((previous) => !previous);

	return (
		<section className="rounded-lg border border-neutral-200 bg-white p-4">
			<div className="flex min-w-0 items-center gap-1 @5xl/rental-detail:hidden">
				<button
					type="button"
					className="flex min-w-0 flex-1 items-center gap-2 text-left"
					onClick={toggleExpanded}
					aria-controls={contentId}
					aria-expanded={isExpanded}
				>
					<CardHeaderIcon>{icon}</CardHeaderIcon>
					<span className="min-w-0">
						<span className="block text-sm font-bold text-neutral-950">
							{title}
						</span>
						<span className="mt-0.5 block break-words text-sm text-neutral-600">
							{summary}
						</span>
					</span>
				</button>
				{headerAction}
				<button
					type="button"
					className="flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={toggleExpanded}
					aria-controls={contentId}
					aria-expanded={isExpanded}
					aria-label={`${isExpanded ? "Contraer" : "Expandir"} ${title}`}
				>
					<ChevronDown
						className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
					/>
				</button>
			</div>
			<div className="hidden @5xl/rental-detail:block">
				<SidebarHeader icon={icon} title={title} action={headerAction} />
			</div>
			<div
				id={contentId}
				className={
					isExpanded
						? "mt-4 @5xl/rental-detail:mt-0"
						: "hidden @5xl/rental-detail:block"
				}
			>
				{children}
			</div>
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
		<div className="mb-2 flex items-center gap-2 border-neutral-100 border-b pb-2">
			<CardHeaderIcon>{icon}</CardHeaderIcon>
			<h2 className="min-w-0 flex-1 text-sm font-bold text-neutral-950">
				{title}
			</h2>
			{action}
		</div>
	);
}
