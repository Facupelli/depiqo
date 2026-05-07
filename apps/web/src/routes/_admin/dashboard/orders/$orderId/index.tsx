import { FulfillmentMethod } from "@repo/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	CheckCircle2,
	ChevronDown,
	Clock,
	ExternalLink,
	FileSignature,
	Mail,
	MapPin,
	Package,
	RotateCcw,
	Truck,
	User2Icon,
} from "lucide-react";
import { useState } from "react";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	getCustomerContactName,
	getCustomerDisplayName,
	getCustomerInitials,
} from "@/features/customer/customer.utils";
import { OrderDetailActionsMenu } from "@/features/orders/components/order-detail-actions-menu";
import { OrderDetailBudgetDialogs } from "@/features/orders/components/order-detail-budget-dialogs";
import { OrderDetailCancelDialog } from "@/features/orders/components/order-detail-cancel-dialog";
import { OrderDetailConfirmDialog } from "@/features/orders/components/order-detail-confirm-dialog";
import { OrderDetailDocumentErrorDialogs } from "@/features/orders/components/order-detail-document-error-dialogs";
import { OrderDetailLifecycleDialog } from "@/features/orders/components/order-detail-lifecycle-dialog";
import { OrderSigningInvitationDialog } from "@/features/orders/components/order-signing-invitation-dialog";
import {
	OrderDetailProvider,
	useOrderDetailContext,
} from "@/features/orders/contexts/order-detail.context";
import { getOrderEditAvailability } from "@/features/orders/order-editor/utils/order-edit-availability";
import {
	formatMoney,
	formatOrderNumber,
	getBundleSummary,
	getExternalOwnersByProductType,
	getItemQty,
	getItemSerialNumber,
	getOrderHeaderBannerConfig,
	getOwnerDisplay,
	type OrderHeaderBannerTone,
} from "@/features/orders/order.utils";
import { ordersListSearchSchema } from "@/features/orders/orders-list.search";
import {
	createOrderDetailQueryOptions,
	type ParsedOrderDetailResponseDto,
} from "@/features/orders/queries/get-order-by-id";
import { nowUtc } from "@/lib/dates/parse";
import { AdminRouteError } from "@/shared/components/admin-route-error";

type OrderDetailItem = ParsedOrderDetailResponseDto["items"][number];
type ProductOrderDetailItem = Extract<OrderDetailItem, { type: "PRODUCT" }>;

export const Route = createFileRoute("/_admin/dashboard/orders/$orderId/")({
	validateSearch: ordersListSearchSchema,
	loader: ({ context: { queryClient }, params: { orderId } }) => {
		queryClient.ensureQueryData(createOrderDetailQueryOptions({ orderId }));
	},
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el contenido del pedido."
				forbiddenMessage="No tienes permisos para ver el pedido."
			/>
		);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { orderId } = Route.useParams();
	const search = Route.useSearch();
	const { data: order } = useSuspenseQuery(
		createOrderDetailQueryOptions({ orderId }),
	);

	return (
		<OrderDetailProvider order={order}>
			<div className="min-h-screen bg-neutral-50 text-neutral-950 px-8">
				<PageBreadcrumb
					parent={{ label: "Pedidos", to: "/dashboard/orders", search }}
					current={String(order.number)}
				/>

				<OrderHeader />

				<div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] py-10 gap-20">
					{/* Left */}
					<div>
						<OrderTabs />
					</div>

					{/* Right */}
					<div className="space-y-4">
						<OrderClientCard />
						<OrderSigningCard />
						<OrderLogisticsCard />
						<OrderFinancialsCard />
					</div>
				</div>
			</div>
		</OrderDetailProvider>
	);
}

function OrderHeader() {
	const { order } = useOrderDetailContext();

	return (
		<header className="border-b border-neutral-200 pb-8">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
					<div>
						<div className="flex flex-wrap items-center gap-3 mb-1.5">
							<div>
								<h1 className="text-3xl font-bold tracking-tight leading-none">
									<span>#{formatOrderNumber(order.number)}</span>
								</h1>
							</div>
						</div>
						<p className="text-sm text-neutral-400 mt-2">
							Creado el {order.createdAt.format("DD MMM, YYYY")} ·{" "}
							{order.createdAt.format("HH:mm A")}
						</p>
					</div>

					<div className="flex justify-start xl:justify-end">
						<OrderDetailActionsMenu />
					</div>
				</div>

				<OrderHeaderBanner />
			</div>

			<OrderDetailDocumentErrorDialogs />
			<OrderDetailCancelDialog />
			<OrderDetailLifecycleDialog />
			<OrderDetailConfirmDialog />
			<OrderDetailBudgetDialogs />
			<OrderSigningInvitationDialog />
		</header>
	);
}

const ORDER_HEADER_BANNER_TONE_STYLES: Record<
	OrderHeaderBannerTone,
	{
		panelClassName: string;
		iconWrapClassName: string;
		iconClassName: string;
		metaClassName: string;
	}
> = {
	neutral: {
		panelClassName: "border-neutral-200 bg-white",
		iconWrapClassName: "bg-neutral-100 text-neutral-700",
		iconClassName: "text-neutral-700",
		metaClassName: "text-neutral-500",
	},
	info: {
		panelClassName: "border-sky-200 bg-sky-50/80",
		iconWrapClassName: "bg-sky-100 text-sky-700",
		iconClassName: "text-sky-700",
		metaClassName: "text-sky-800/80",
	},
	warning: {
		panelClassName: "border-amber-200 bg-amber-50/80",
		iconWrapClassName: "bg-amber-100 text-amber-700",
		iconClassName: "text-amber-700",
		metaClassName: "text-amber-900/80",
	},
	danger: {
		panelClassName: "border-red-200 bg-red-50/80",
		iconWrapClassName: "bg-red-100 text-red-700",
		iconClassName: "text-red-700",
		metaClassName: "text-red-900/80",
	},
	success: {
		panelClassName: "border-emerald-200 bg-emerald-50/80",
		iconWrapClassName: "bg-emerald-100 text-emerald-700",
		iconClassName: "text-emerald-700",
		metaClassName: "text-emerald-900/80",
	},
	muted: {
		panelClassName: "border-neutral-200 bg-neutral-100/80",
		iconWrapClassName: "bg-neutral-200 text-neutral-600",
		iconClassName: "text-neutral-600",
		metaClassName: "text-neutral-600",
	},
};

function OrderHeaderBanner() {
	const { order } = useOrderDetailContext();
	const banner = getOrderHeaderBannerConfig(
		order,
		nowUtc(),
		order.location.effectiveTimezone,
	);
	const styles = ORDER_HEADER_BANNER_TONE_STYLES[banner.tone];
	const BannerIcon = getOrderHeaderBannerIcon(
		banner.tone,
		banner.primaryAction,
	);

	return (
		<section
			className={`rounded-2xl border px-5 py-5 sm:px-6 ${styles.panelClassName}`}
		>
			<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
				<div className="flex items-start gap-4">
					<div
						className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${styles.iconWrapClassName}`}
					>
						<BannerIcon className={`size-7 ${styles.iconClassName}`} />
					</div>

					<div className="space-y-2">
						<h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
							{banner.title}
						</h2>
						{banner.subtitle ? (
							<p className="max-w-2xl text-sm text-neutral-700">
								{banner.subtitle}
							</p>
						) : null}
						<p className={`text-sm font-medium ${styles.metaClassName}`}>
							{banner.meta}
						</p>
					</div>
				</div>

				<OrderHeaderBannerActions />
			</div>
		</section>
	);
}

function OrderHeaderBannerActions() {
	const { order, actions } = useOrderDetailContext();
	const banner = getOrderHeaderBannerConfig(
		order,
		nowUtc(),
		order.location.effectiveTimezone,
	);
	const primaryAction = getOrderHeaderPrimaryButtonConfig(
		banner.primaryAction,
		actions,
	);
	const editAvailability = getOrderEditAvailability(order, nowUtc());

	if (!primaryAction && !editAvailability.canEdit) {
		return null;
	}

	const PrimaryIcon = primaryAction?.icon;

	return (
		<div className="flex w-full flex-col gap-3 lg:w-70 lg:shrink-0">
			{primaryAction && PrimaryIcon ? (
				<Button
					className={primaryAction.className}
					onClick={primaryAction.onClick}
				>
					<PrimaryIcon className="size-4" />
					{primaryAction.label}
				</Button>
			) : null}

			{editAvailability.canEdit ? (
				<Button variant="outline" onClick={actions.edit.open}>
					Editar pedido
				</Button>
			) : null}
		</div>
	);
}

function getOrderHeaderBannerIcon(
	tone: OrderHeaderBannerTone,
	primaryAction: "confirm" | "pickup" | "return" | null,
) {
	if (primaryAction === "pickup") {
		return Truck;
	}

	if (primaryAction === "return") {
		return RotateCcw;
	}

	if (primaryAction === "confirm") {
		return Package;
	}

	if (tone === "success") {
		return CheckCircle2;
	}

	if (tone === "danger") {
		return Clock;
	}

	return Package;
}

function getOrderHeaderPrimaryButtonConfig(
	action: "confirm" | "pickup" | "return" | null,
	actions: ReturnType<typeof useOrderDetailContext>["actions"],
) {
	switch (action) {
		case "confirm":
			return {
				label: "Confirmar pedido",
				icon: CheckCircle2,
				className: "h-11 bg-neutral-950 text-white hover:bg-neutral-800",
				onClick: actions.confirmation.openDialog,
			};
		case "pickup":
			return {
				label: "Marcar equipo como retirado",
				icon: Truck,
				className: "h-11 bg-neutral-950 text-white hover:bg-neutral-800",
				onClick: actions.lifecycle.openPickup,
			};
		case "return":
			return {
				label: "Marcar equipo como devuelto",
				icon: RotateCcw,
				className: "h-11 bg-neutral-950 text-white hover:bg-neutral-800",
				onClick: actions.lifecycle.openReturn,
			};
		default:
			return null;
	}
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function OrderTabs() {
	return (
		<Tabs defaultValue="equipment" className="flex flex-col gap-y-6">
			<TabsList>
				{(
					[
						{ value: "equipment", label: "Equipos y combos" },
						{ value: "documents", label: "Documentos" },
						{ value: "notes", label: "Notas internas" },
					] as const
				).map((tab) => (
					<TabsTrigger key={tab.value} value={tab.value}>
						{tab.label}
					</TabsTrigger>
				))}
			</TabsList>

			<TabsContent value="equipment">
				<EquipmentTabHeader />
				<OrderItemsTable />
				<ActivityLog />
			</TabsContent>

			<TabsContent value="documents">
				<TabPlaceholder label="No hay documentos adjuntos." />
			</TabsContent>

			<TabsContent value="notes">
				<TabPlaceholder label="Todavia no hay notas internas." />
			</TabsContent>
		</Tabs>
	);
}

function EquipmentTabHeader() {
	const { order } = useOrderDetailContext();
	const accessoryActionLabel = hasSavedAccessories(order.items)
		? "Edit accessories"
		: "Assign accessories";

	return (
		<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 className="text-sm font-semibold text-neutral-950">
					Equipos y accesorios
				</h2>
				<p className="mt-1 text-xs text-neutral-500">
					Revisa los equipos del pedido y los accesorios guardados.
				</p>
			</div>

			<Link
				to="/dashboard/orders/$orderId/accessories"
				params={{ orderId: order.id }}
				className={buttonVariants({ variant: "outline" })}
			>
				{accessoryActionLabel}
			</Link>
		</div>
	);
}

function TabPlaceholder({ label }: { label: string }) {
	return (
		<div className="border border-dashed border-neutral-200 py-16 flex items-center justify-center rounded-md">
			<span className="text-sm text-neutral-300">{label}</span>
		</div>
	);
}

// ─── Items Table ──────────────────────────────────────────────────────────────

function OrderItemsTable() {
	const { order } = useOrderDetailContext();
	const { items, financial } = order;

	// Build a map from orderItemId → financial line for O(1) lookup per row
	const financialByItemId = new Map(
		financial.items.map((line) => [line.orderItemId, line]),
	);

	return (
		<section className="mb-10">
			{/* Column headers */}
			<div className="grid grid-cols-[1fr_80px_100px_100px] gap-4 pb-3 border-b border-neutral-200">
				<span className="font-mono text-[10px] tracking-[0.14em] uppercase text-neutral-400">
					Item Description
				</span>
				<span className="font-mono text-[10px] tracking-[0.14em] uppercase text-neutral-400 text-center">
					Quantity
				</span>
				<span className="font-mono text-[10px] tracking-[0.14em] uppercase text-neutral-400 text-right">
					Base Price
				</span>
				<span className="font-mono text-[10px] tracking-[0.14em] uppercase text-neutral-400 text-right">
					Total
				</span>
			</div>

			<div>
				{items.map((item) => (
					<OrderItemRow
						key={item.id}
						item={item}
						financialLine={financialByItemId.get(item.id) ?? null}
					/>
				))}
			</div>
		</section>
	);
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

// OrderItemRow still receives props: it's a repeated row inside a list,
// and each instance has its own item + financialLine data. Context would
// require passing the item id and doing a lookup inside — props are cleaner here.

function OrderItemRow({
	item,
	financialLine,
}: {
	item: ParsedOrderDetailResponseDto["items"][number];
	financialLine:
		| ParsedOrderDetailResponseDto["financial"]["items"][number]
		| null;
}) {
	const serialNumber = getItemSerialNumber(item);
	const bundleSummary = getBundleSummary(item);
	const qty = getItemQty(item);
	const savedAccessories = getSavedAccessories(item);

	// For product items: show a single owner name if the asset is externally owned.
	// For bundle items: show per-product-type external ownership — getOwnerDisplay
	// would incorrectly imply the entire bundle is externally owned.
	const productOwner =
		item.type !== "BUNDLE" ? getOwnerDisplay(item.assets) : null;
	const bundleExternalOwners =
		item.type === "BUNDLE" ? getExternalOwnersByProductType(item) : [];

	return (
		<div className="grid grid-cols-[1fr_80px_100px_100px] gap-4 items-center py-4 border-b border-neutral-100 hover:bg-neutral-50 transition-colors rounded-sm">
			{/* Info */}
			<div className="flex items-center gap-4">
				<div className="w-16 h-14 bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 rounded-sm">
					<Package className="w-5 h-5 text-neutral-300" />
				</div>
				<div className="flex flex-col gap-0.5 min-w-0">
					<span className="text-sm font-semibold text-neutral-950 leading-snug">
						{item.name}
					</span>

					{financialLine?.pricing.isOverridden && (
						<span className="text-[11px] font-medium text-amber-700">
							Precio ajustado manualmente
						</span>
					)}

					{/* Product item: single owner line */}
					{productOwner && (
						<span className="text-[11px] text-neutral-500 flex items-center gap-1">
							<User2Icon className="size-3 shrink-0" />
							{productOwner}
						</span>
					)}

					{/* Bundle item: one line per externally-owned product type */}
					{bundleExternalOwners.map((entry) => (
						<span
							key={entry.productTypeName}
							className="text-[11px] text-neutral-500 flex items-center gap-1"
						>
							<User2Icon className="size-3 shrink-0" />
							<span className="font-medium text-neutral-600">
								{entry.productTypeName}
							</span>
							<span className="text-neutral-400">·</span>
							{entry.ownerNames}
						</span>
					))}

					{serialNumber && (
						<span className="font-mono text-[11px] text-neutral-400">
							S/N: {serialNumber}
						</span>
					)}
					{bundleSummary && (
						<span className="text-[11px] text-neutral-500 font-medium">
							Bundle: {bundleSummary}
						</span>
					)}

					{savedAccessories.length > 0 ? (
						<div className="mt-2 space-y-1.5 rounded-md border border-neutral-200 bg-white px-3 py-2">
							<p className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-400">
								Accesorios guardados
							</p>
							<div className="space-y-1.5">
								{savedAccessories.map((accessory) => (
									<SavedAccessoryLine
										key={accessory.id}
										accessory={accessory}
									/>
								))}
							</div>
						</div>
					) : null}
				</div>
			</div>

			{/* Qty */}
			<div className="text-center">
				<span className="font-mono text-sm text-neutral-600">{qty}</span>
			</div>

			{/* Base price */}
			<div className="text-right">
				<span className="font-mono text-sm text-neutral-500">
					{financialLine ? formatMoney(financialLine.basePrice) : "—"}
				</span>
			</div>

			{/* Final price */}
			<div className="text-right">
				<span className="font-mono text-sm font-bold text-neutral-950">
					{financialLine ? formatMoney(financialLine.finalPrice) : "—"}
				</span>
			</div>
		</div>
	);
}

function SavedAccessoryLine({
	accessory,
}: {
	accessory: ProductOrderDetailItem["accessories"][number];
}) {
	const assignedAssetLabels = accessory.assignedAssets
		.map((asset) => asset.serialNumber)
		.filter((serialNumber): serialNumber is string => Boolean(serialNumber));

	return (
		<div className="rounded-sm bg-neutral-50 px-2.5 py-2">
			<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
				<span className="text-xs font-medium text-neutral-800">
					{accessory.name}
				</span>
				<span className="font-mono text-[11px] text-neutral-500">
					x{accessory.quantity}
				</span>
			</div>

			{accessory.notes ? (
				<p className="mt-1 text-[11px] text-neutral-500">{accessory.notes}</p>
			) : null}

			{assignedAssetLabels.length > 0 ? (
				<p className="mt-1 font-mono text-[10px] text-neutral-400">
					Assets: {assignedAssetLabels.join(", ")}
				</p>
			) : null}
		</div>
	);
}

function getSavedAccessories(item: OrderDetailItem) {
	return isProductOrderItem(item) ? item.accessories : [];
}

function hasSavedAccessories(items: OrderDetailItem[]) {
	return items.some((item) => getSavedAccessories(item).length > 0);
}

function isProductOrderItem(item: OrderDetailItem): item is ProductOrderDetailItem {
	return item.type === "PRODUCT";
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

function ActivityLog() {
	const { order } = useOrderDetailContext();

	return (
		<section>
			<div className="flex items-center gap-2 mb-5">
				<Clock className="w-4 h-4 text-neutral-400" />
				<span className="text-sm font-semibold text-neutral-950">
					Activity Log
				</span>
			</div>

			<div>
				<ActivityEntry
					label="Order created"
					timestamp={order.createdAt.format("MMM DD, YYYY [at] HH:mm")}
					actor="System"
					isLast
				/>
			</div>
		</section>
	);
}

function ActivityEntry({
	label,
	timestamp,
	actor,
	isLast = false,
}: {
	label: string;
	timestamp: string;
	actor: string;
	isLast?: boolean;
}) {
	return (
		<div className="flex items-start gap-4">
			{/* Timeline column */}
			<div className="flex flex-col items-center shrink-0 pt-1">
				<div className="w-8 h-8 rounded-full bg-neutral-950 flex items-center justify-center">
					<Clock className="w-3.5 h-3.5 text-white" />
				</div>
				{!isLast && <div className="w-px flex-1 bg-neutral-200 mt-1 min-h-6" />}
			</div>

			{/* Content */}
			<div className="flex flex-col gap-0.5 pb-6">
				<span className="text-sm font-semibold text-neutral-950">{label}</span>
				<span className="text-xs text-neutral-400">
					{timestamp} · {actor}
				</span>
			</div>
		</div>
	);
}

// ─── Client Card ──────────────────────────────────────────────────────────────

function OrderClientCard() {
	const { order } = useOrderDetailContext();
	const customer = order.customer;
	const displayName = customer ? getCustomerDisplayName(customer) : null;
	const contactName = customer ? getCustomerContactName(customer) : null;
	const initials = customer ? getCustomerInitials(customer) : null;

	return (
		<section className="bg-white border border-neutral-200 rounded-lg p-5">
			{/* Header */}
			<div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
				<span className="font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-400">
					Información del Cliente
				</span>
				{customer ? (
					<Link
						to="/dashboard/customers/$customerId"
						params={{ customerId: customer.id }}
						className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-950 transition-colors"
					>
						Ver Perfil
						<ExternalLink className="w-3 h-3" />
					</Link>
				) : null}
			</div>

			{customer ? (
				<>
					{/* Avatar + name */}
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
							<span className="text-sm font-bold text-neutral-600">
								{initials}
							</span>
						</div>
						<div>
							<p className="text-sm font-bold text-neutral-950 leading-tight">
								{displayName}
							</p>
							{contactName && (
								<p className="text-xs text-neutral-400 mt-0.5">{contactName}</p>
							)}
						</div>
					</div>

					{/* Contact fields */}
					<div className="space-y-2.5">
						<SidebarField
							icon={<Mail className="w-3.5 h-3.5" />}
							value={customer.email}
						/>
					</div>
				</>
			) : (
				<div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-3">
					<p className="text-sm font-medium text-amber-900">
						Todavia no hay un cliente vinculado.
					</p>
					<p className="mt-1 text-xs text-amber-800/85">
						La confirmacion del borrador esta bloqueada hasta asociar un
						cliente.
					</p>
				</div>
			)}
		</section>
	);
}

function OrderSigningCard() {
	const { order } = useOrderDetailContext();
	const [isExpanded, setIsExpanded] = useState(false);
	const isConfirmedLifecycle =
		order.status === "CONFIRMED" ||
		order.status === "ACTIVE" ||
		order.status === "COMPLETED";

	if (!isConfirmedLifecycle) {
		return null;
	}

	const statusMeta = getSigningStatusMeta(order.signing.status);
	const isSigned = order.signing.status === "SIGNED";
	const summaryTimestamp =
		order.signing.signedAt ?? order.signing.expiresAt ?? order.signing.createdAt;

	return (
		<section className="bg-white border border-neutral-200 rounded-lg p-5">
			<button
				type="button"
				onClick={() => setIsExpanded((previous) => !previous)}
				className="flex w-full items-start justify-between gap-4 text-left"
			>
				<div className="min-w-0">
					<div className="flex items-center gap-2 pb-3">
						<span className="font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-400">
							Firma del contrato
						</span>
					</div>
					<div className="flex items-center gap-3">
						<div
							className={`flex size-10 shrink-0 items-center justify-center rounded-full ${statusMeta.iconWrapClassName}`}
						>
							<FileSignature className={`size-4 ${statusMeta.iconClassName}`} />
						</div>
						<div className="min-w-0">
							<p className="text-sm font-semibold text-neutral-950">
								{statusMeta.label}
							</p>
							<p className="mt-0.5 text-xs text-neutral-500">
								{statusMeta.description}
							</p>
						</div>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2 pt-1 text-neutral-400">
					<ChevronDown
						className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
					/>
				</div>
			</button>

			<div className="mt-4 space-y-3">
				<SidebarField
					icon={<Mail className="w-3.5 h-3.5" />}
					value={
						order.signing.recipientEmail ??
						order.customer?.email ??
						"Sin email cargado"
					}
				/>

				{!isSigned ? (
					<SigningSummaryDetails
						summaryTimestamp={summaryTimestamp}
						expiresAt={order.signing.expiresAt}
					/>
				) : null}
			</div>

			{isExpanded ? (
				<div className="mt-4 space-y-4 border-t border-neutral-100 pt-4">
					{isSigned ? (
						<SigningSummaryDetails
							summaryTimestamp={summaryTimestamp}
							expiresAt={order.signing.expiresAt}
						/>
					) : null}

					<SigningDetailRow
						label="Creada"
						value={formatOptionalSigningDate(order.signing.createdAt)}
					/>
					<SigningDetailRow
						label="Firmada"
						value={formatOptionalSigningDate(order.signing.signedAt)}
					/>
				</div>
			) : null}
		</section>
	);
}

// ─── Logistics Card ───────────────────────────────────────────────────────────

function OrderLogisticsCard() {
	const { order } = useOrderDetailContext();
	const {
		bookingSnapshot,
		deliveryRequest,
		fulfillmentMethod,
		location,
		pickupAt,
		returnAt,
	} = order;

	return (
		<section className="bg-white border border-neutral-200 rounded-lg p-5">
			<SidebarSectionLabel label="Logistics" />

			<div className="grid grid-cols-2 gap-4 mb-4">
				<div>
					<p className="font-mono text-[9px] tracking-[0.12em] uppercase text-neutral-400 mb-1">
						Fecha de retiro
					</p>
					<p className="text-sm font-bold text-neutral-950">
						{bookingSnapshot.pickupDate.format("MMM DD, YYYY")}
					</p>
					<p className="font-mono text-[10px] text-neutral-400 mt-0.5">
						{pickupAt.tz(bookingSnapshot.timezone).format("HH:mm")}
					</p>
				</div>
				<div>
					<p className="font-mono text-[9px] tracking-[0.12em] uppercase text-neutral-400 mb-1">
						Fecha de devolución
					</p>
					<p className="text-sm font-bold text-neutral-950">
						{bookingSnapshot.returnDate.format("MMM DD, YYYY")}
					</p>
					<p className="font-mono text-[10px] text-neutral-400 mt-0.5">
						{returnAt.tz(bookingSnapshot.timezone).format("HH:mm")}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-md px-3 py-2.5">
				<MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
				<div>
					<p className="font-mono text-[9px] tracking-widest uppercase text-neutral-400 mb-0.5">
						Ubicación Depósito
					</p>
					<p className="text-sm font-semibold text-neutral-950">
						{location.name}
					</p>
				</div>
			</div>

			<div className="mt-4 flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-md px-3 py-2.5">
				<Truck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
				<div>
					<p className="font-mono text-[9px] tracking-widest uppercase text-neutral-400 mb-0.5">
						Fulfillment
					</p>
					<p className="text-sm font-semibold text-neutral-950">
						{fulfillmentMethod === FulfillmentMethod.DELIVERY
							? "Solicitó delivery"
							: "Retiro en punto de entrega"}
					</p>
				</div>
			</div>

			{deliveryRequest && (
				<div className="mt-4 rounded-md border border-neutral-200 bg-white p-4">
					<p className="font-mono text-[9px] tracking-widest uppercase text-neutral-400 mb-3">
						Pedido de Delivery
					</p>

					<div className="space-y-2 text-sm text-neutral-700">
						<p className="font-semibold text-neutral-950">
							{deliveryRequest.recipientName}
						</p>
						<p>{deliveryRequest.phone}</p>
						<p>
							{deliveryRequest.addressLine1}
							{deliveryRequest.addressLine2
								? `, ${deliveryRequest.addressLine2}`
								: ""}
						</p>
						<p>
							{deliveryRequest.city}, {deliveryRequest.stateRegion}{" "}
							{deliveryRequest.postalCode}
						</p>
						<p>{deliveryRequest.country}</p>
						{deliveryRequest.instructions && (
							<div className="rounded-md bg-neutral-50 px-3 py-2 text-neutral-600">
								{deliveryRequest.instructions}
							</div>
						)}
					</div>
				</div>
			)}
		</section>
	);
}

// ─── Financials Card ──────────────────────────────────────────────────────────

function OrderFinancialsCard() {
	const { order } = useOrderDetailContext();
	const { financial } = order;
	const [showPricingAudit, setShowPricingAudit] = useState(false);
	const hasAdjustedLines = financial.items.some(
		(line) => line.pricing.isOverridden,
	);
	const hasOwnerObligations = financial.ownerObligations !== "0";

	return (
		<section className="bg-white border border-neutral-200 rounded-lg p-5">
			<SidebarSectionLabel label="Resumen financiero" />

			{hasAdjustedLines ? (
				<div className="mb-4 flex items-start justify-between gap-4 rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2.5">
					<div>
						<p className="text-sm font-medium text-amber-900">
							Hay precios ajustados manualmente
						</p>
						<p className="text-xs text-amber-800/80">
							Mostrar auditoria detallada por linea
						</p>
					</div>
					<Switch
						checked={showPricingAudit}
						onCheckedChange={setShowPricingAudit}
						aria-label="Mostrar auditoria de ajustes manuales"
					/>
				</div>
			) : null}

			<div>
				{financial.items.map((line) => (
					<div key={line.orderItemId} className="border-b border-neutral-100">
						{/* Item label + base price */}
						<div className="flex items-center justify-between">
							<span className="text-sm text-neutral-500">{line.label}</span>
							<span
								className={`font-mono text-sm ${line.discounts.length > 0 ? `text-neutral-400` : `text-neutral-950`}`}
							>
								{formatMoney(line.basePrice)}
							</span>
						</div>

						{/* Applied discounts — only shown when discounts exist */}
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

						{/* Final price — only shown when discounts exist, to close the math */}
						{line.discounts.length > 0 && (
							<div className="flex items-center justify-between pt-0.5">
								<span className="text-[11px] text-neutral-400">
									Después de descuentos
								</span>
								<span className="font-mono text-sm font-semibold text-neutral-950">
									{formatMoney(line.finalPrice)}
								</span>
							</div>
						)}

						{line.pricing.isOverridden && showPricingAudit ? (
							<PricingAuditSection line={line} />
						) : null}

						{/* Owner split breakdown — only shown for external-owned items */}
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

			<div className="mt-4 border-t border-dashed border-neutral-200 pt-4">
				<div className="space-y-2">
					<FinancialSummaryRow
						label="Subtotal antes de descuentos"
						value={financial.subtotalBeforeDiscounts}
					/>
					<FinancialSummaryRow
						label="Descuentos de artículos"
						value={financial.itemsDiscountTotal}
						tone="success"
						prefix="-"
					/>
					<FinancialSummaryRow
						label="Subtotal de equipos"
						value={financial.itemsSubtotal}
					/>
					{financial.insuranceApplied && (
						<FinancialSummaryRow
							label="Seguro de equipos"
							value={financial.insuranceAmount}
						/>
					)}
				</div>
			</div>

			{/* Revenue breakdown — only shown when order has external-owned assets */}
			{hasOwnerObligations && (
				<div className="mt-3 pt-3 border-t border-dashed border-neutral-200 flex flex-col gap-1.5">
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

			{/* Total */}
			<div className="flex items-baseline justify-between pt-4 mt-1">
				<span className="text-sm font-bold text-neutral-950">Total</span>
				<span className="font-mono text-xl font-bold text-neutral-950 tracking-tight">
					{formatMoney(financial.total)}
				</span>
			</div>
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

function formatSignedMoney(amount: string): string {
	const value = Number(amount);

	if (Number.isNaN(value)) {
		return formatMoney(amount);
	}

	if (value === 0) {
		return formatMoney(amount);
	}

	return `${value > 0 ? `+` : `-`}${formatMoney(String(Math.abs(value)))}`;
}

// ─── Shared Sidebar Primitives ────────────────────────────────────────────────

function SidebarSectionLabel({ label }: { label: string }) {
	return (
		<p className="font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-400 mb-4 pb-3 border-b border-neutral-100">
			{label}
		</p>
	);
}

function SigningDetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<p className="font-mono text-[10px] tracking-[0.12em] uppercase text-neutral-400">
				{label}
			</p>
			<p className="text-sm font-medium text-neutral-950">{value}</p>
		</div>
	);
}

function SigningSummaryDetails({
	summaryTimestamp,
	expiresAt,
}: {
	summaryTimestamp:
		| ParsedOrderDetailResponseDto["signing"]["signedAt"]
		| ParsedOrderDetailResponseDto["signing"]["expiresAt"]
		| ParsedOrderDetailResponseDto["signing"]["createdAt"];
	expiresAt: ParsedOrderDetailResponseDto["signing"]["expiresAt"];
}) {
	return (
		<div className="space-y-3">
			<div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
				<p className="font-mono text-[9px] tracking-widest uppercase text-neutral-400 mb-1">
					Actividad
				</p>
				<p className="text-sm font-semibold text-neutral-950">
					{summaryTimestamp
						? formatSigningDate(summaryTimestamp)
						: "Sin actividad registrada"}
				</p>
			</div>

			{expiresAt ? (
				<div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
					<p className="font-mono text-[9px] tracking-widest uppercase text-neutral-400 mb-1">
						Vence
					</p>
					<p className="text-sm font-semibold text-neutral-950">
						{formatSigningDate(expiresAt)}
					</p>
				</div>
			) : null}
		</div>
	);
}

function SidebarField({
	icon,
	value,
}: {
	icon: React.ReactNode;
	value: string;
}) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-neutral-400 shrink-0">{icon}</span>
			<span className="text-xs text-neutral-500">{value}</span>
		</div>
	);
}

function getSigningStatusMeta(
	status: ParsedOrderDetailResponseDto["signing"]["status"],
) {
	switch (status) {
		case "NO_REQUEST":
			return {
				label: "Sin solicitud activa",
				description: "Aun no se creo una solicitud para firmar.",
				iconWrapClassName: "bg-neutral-100 text-neutral-600",
				iconClassName: "text-neutral-600",
			};
		case "PENDING":
			return {
				label: "Pendiente de firma",
				description: "La solicitud fue creada y espera la firma del cliente.",
				iconWrapClassName: "bg-amber-100 text-amber-700",
				iconClassName: "text-amber-700",
			};
		case "SIGNED":
			return {
				label: "Contrato firmado",
				description: "La aceptación quedo registrada correctamente.",
				iconWrapClassName: "bg-emerald-100 text-emerald-700",
				iconClassName: "text-emerald-700",
			};
		case "EXPIRED":
			return {
				label: "Solicitud vencida",
				description: "La solicitud expiró y requiere un nuevo envio.",
				iconWrapClassName: "bg-red-100 text-red-700",
				iconClassName: "text-red-700",
			};
		case "VOIDED":
			return {
				label: "Solicitud anulada",
				description: "La solicitud anterior ya no esta disponible.",
				iconWrapClassName: "bg-neutral-200 text-neutral-600",
				iconClassName: "text-neutral-600",
			};
	}
}

function formatSigningDate(
	value: NonNullable<ParsedOrderDetailResponseDto["signing"]["expiresAt"]>,
) {
	return value.format("DD MMM, YYYY · HH:mm");
}

function formatOptionalSigningDate(
	value:
		| ParsedOrderDetailResponseDto["signing"]["createdAt"]
		| ParsedOrderDetailResponseDto["signing"]["signedAt"]
		| ParsedOrderDetailResponseDto["signing"]["expiresAt"],
) {
	return value ? formatSigningDate(value) : "Sin registro";
}
