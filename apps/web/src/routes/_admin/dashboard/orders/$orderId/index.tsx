import { FulfillmentMethod, OrderStatus } from "@repo/types";
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
	ReceiptText,
	RotateCcw,
	Truck,
	User2Icon,
} from "lucide-react";
import { Fragment, useState } from "react";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
	getCustomerContactName,
	getCustomerDisplayName,
	getCustomerInitials,
} from "@/features/customer/customer.utils";
import { accessoryPreparationQueries } from "@/features/orders/accessory-preparation/accessory-preparation.queries";
import { AccessoryPreparationWorkspace } from "@/features/orders/accessory-preparation/components/accessory-preparation-workspace";
import { OrderDetailActionsMenu } from "@/features/orders/components/order-detail-actions-menu";
import { OrderDetailBudgetDialogs } from "@/features/orders/components/order-detail-budget-dialogs";
import { OrderDetailCancelDialog } from "@/features/orders/components/order-detail-cancel-dialog";
import { OrderDetailConfirmDialog } from "@/features/orders/components/order-detail-confirm-dialog";
import { OrderDetailDocumentErrorDialogs } from "@/features/orders/components/order-detail-document-error-dialogs";
import { OrderDetailLifecycleDialog } from "@/features/orders/components/order-detail-lifecycle-dialog";
import { OrderOperationalPhaseBadge } from "@/features/orders/components/order-operational-phase-badge";
import { OrderSigningInvitationDialog } from "@/features/orders/components/order-signing-invitation-dialog";
import {
	OrderDetailProvider,
	useOrderDetailContext,
} from "@/features/orders/contexts/order-detail.context";
import {
	formatMoney,
	formatOrderNumber,
	getBundleSummary,
	getExternalOwnersByProductType,
	getItemQty,
	getOrderHeaderBannerConfig,
	getOwnerDisplay,
	type OrderHeaderBannerTone,
} from "@/features/orders/order.utils";
import { ORDER_HEADER_BANNER_TONE_STYLES } from "@/features/orders/orders.constants";
import { ordersListSearchSchema } from "@/features/orders/orders-list.search";
import {
	createOrderDetailQueryOptions,
	type ParsedOrderDetailResponseDto,
} from "@/features/orders/queries/get-order-by-id";
import { nowUtc } from "@/lib/dates/parse";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { AdminRouteError } from "@/shared/components/admin-route-error";

type OrderDetailItem = ParsedOrderDetailResponseDto["items"][number];
type ProductOrderDetailItem = Extract<OrderDetailItem, { type: "PRODUCT" }>;

export const Route = createFileRoute("/_admin/dashboard/orders/$orderId/")({
	validateSearch: ordersListSearchSchema,
	loader: async ({ context: { queryClient }, params: { orderId } }) => {
		await Promise.all([
			queryClient.ensureQueryData(createOrderDetailQueryOptions({ orderId })),
			queryClient.ensureQueryData(
				accessoryPreparationQueries.detail({ orderId }),
			),
		]);
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
	const [isPreparingAccessories, setIsPreparingAccessories] = useState(false);
	const { data: order } = useSuspenseQuery(
		createOrderDetailQueryOptions({ orderId }),
	);
	const { data: preparation } = useSuspenseQuery(
		accessoryPreparationQueries.detail({ orderId }),
	);

	return (
		<OrderDetailProvider order={order}>
			<div className="min-h-screen bg-neutral-50 text-neutral-950 px-8">
				<PageBreadcrumb
					parent={{ label: "Pedidos", to: "/dashboard/orders", search }}
					current={String(order.number)}
				/>

				<OrderHeader preparation={preparation} />

				{isPreparingAccessories ? (
					<div className="py-10">
						<AccessoryPreparationWorkspace
							orderId={orderId}
							productImagesByOrderItemId={getProductImagesByOrderItemId(
								order.items,
							)}
							preparation={preparation}
							onClose={() => setIsPreparingAccessories(false)}
						/>
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] py-10 gap-20">
						{/* Left */}
						<div>
							<OrderEquipmentSection
								onPrepareAccessories={() => setIsPreparingAccessories(true)}
							/>
						</div>

						{/* Right */}
						<div className="space-y-4">
							<OrderClientCard />
							<OrderSigningCard />
							<OrderLogisticsCard />
							<OrderFinancialsCard />
						</div>
					</div>
				)}
			</div>
		</OrderDetailProvider>
	);
}

function OrderHeader({
	preparation,
}: {
	preparation: { hasSavedAccessory: boolean };
}) {
	const { order } = useOrderDetailContext();
	const isTerminal = TERMINAL_STATUSES.has(order.status as OrderStatus);

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
							{isTerminal ? <OrderOperationalPhaseBadge order={order} /> : null}
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

				{!isTerminal ? <OrderHeaderBanner preparation={preparation} /> : null}
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

const TERMINAL_STATUSES = new Set([
	OrderStatus.COMPLETED,
	OrderStatus.CANCELLED,
	OrderStatus.REJECTED,
	OrderStatus.EXPIRED,
]);

function OrderHeaderBanner({
	preparation,
}: {
	preparation: { hasSavedAccessory: boolean };
}) {
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
			className={`rounded-2xl border px-5 py-5 sm:px-6 ${styles.panelClassName} ${banner.tone === "danger" ? "border-l-4 border-l-red-500" : ""}`}
		>
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex items-start gap-4 min-w-0">
					<div
						className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${styles.iconWrapClassName}`}
					>
						<BannerIcon className={`size-6 ${styles.iconClassName}`} />
					</div>

					<div className="space-y-3 min-w-0">
						<h2 className="text-xl font-semibold tracking-tight text-neutral-950">
							{banner.title}
						</h2>
						<OrderTimeline order={order} preparation={preparation} />
					</div>
				</div>

				<div className="lg:shrink-0">
					<OrderHeaderBannerActions />
				</div>
			</div>
		</section>
	);
}

// --- Types ---

type TimelineStep = {
	label: string;
	state: "completed" | "current" | "pending";
};

type StepKey = "confirm" | "accessories" | "signing" | "pickup" | "return";

// --- Logic ---

function stepState(
	isDone: boolean,
	key: StepKey,
	currentStep: StepKey | null,
): TimelineStep["state"] {
	if (isDone) return "completed";
	if (currentStep === key) return "current";
	return "pending";
}

function getTimelineSteps(
	order: { status: string; signing: { status: string } },
	preparation: { hasSavedAccessory: boolean },
): TimelineStep[] {
	const status = order.status;
	const signingStatus = order.signing?.status ?? "NO_REQUEST";

	const confirmDone =
		status === OrderStatus.CONFIRMED ||
		status === OrderStatus.ACTIVE ||
		status === OrderStatus.COMPLETED;

	const accessoriesDone = preparation.hasSavedAccessory;

	const signingDone = signingStatus === "SIGNED";

	const pickupDone =
		status === OrderStatus.ACTIVE || status === OrderStatus.COMPLETED;

	const returnDone = status === OrderStatus.COMPLETED;

	let currentStep: StepKey | null = null;
	if (status === OrderStatus.DRAFT || status === OrderStatus.PENDING_REVIEW) {
		currentStep = "confirm";
	} else if (status === OrderStatus.CONFIRMED && !accessoriesDone) {
		currentStep = "accessories";
	} else if (status === OrderStatus.CONFIRMED && signingStatus === "PENDING") {
		currentStep = "signing";
	} else if (status === OrderStatus.CONFIRMED) {
		currentStep = "pickup";
	} else if (status === OrderStatus.ACTIVE) {
		currentStep = "return";
	}

	return [
		{
			label: "Confirmado",
			state: stepState(confirmDone, "confirm", currentStep),
		},
		{
			label: "Accesorios",
			state: stepState(accessoriesDone, "accessories", currentStep),
		},
		{ label: "Firma", state: stepState(signingDone, "signing", currentStep) },
		{ label: "Retiro", state: stepState(pickupDone, "pickup", currentStep) },
		{
			label: "Devolución",
			state: stepState(returnDone, "return", currentStep),
		},
	];
}

// --- Style maps (replaces all JSX ternary chains) ---

const dotStyles: Record<TimelineStep["state"], string> = {
	completed: "bg-neutral-950",
	current:
		"bg-neutral-950 ring-[3px] ring-offset-[1.5px] ring-neutral-950 ring-offset-white",
	pending: "border border-neutral-300 bg-transparent",
};

const labelStyles: Record<TimelineStep["state"], string> = {
	completed: "text-neutral-500 font-medium",
	current: "text-neutral-950 font-bold",
	pending: "text-neutral-400 font-normal",
};

function OrderTimeline({
	order,
	preparation,
}: {
	order: { status: string; signing: { status: string } };
	preparation: { hasSavedAccessory: boolean };
}) {
	const steps = getTimelineSteps(order, preparation);

	return (
		<div className="flex items-center">
			{steps.map((step, i) => (
				<Fragment key={step.label}>
					{i > 0 && (
						<div
							className={`h-px flex-1 min-w-5 mb-4.25 shrink ${
								steps[i - 1].state === "completed"
									? "bg-neutral-950"
									: "bg-neutral-200"
							}`}
						/>
					)}
					<div className="flex flex-col items-center gap-1.5">
						<div
							className={`size-2 rounded-full shrink-0 ${dotStyles[step.state]}`}
						/>
						<span
							className={`text-[11px] whitespace-nowrap leading-none tracking-wide ${labelStyles[step.state]}`}
						>
							{step.label}
						</span>
					</div>
				</Fragment>
			))}
		</div>
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

	if (!primaryAction) {
		return null;
	}

	const PrimaryIcon = primaryAction.icon;

	return (
		<Button className={primaryAction.className} onClick={primaryAction.onClick}>
			<PrimaryIcon className="size-4" />
			{primaryAction.label}
		</Button>
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
				className: "bg-neutral-950 text-white hover:bg-neutral-800",
				onClick: actions.confirmation.openDialog,
			};
		case "pickup":
			return {
				label: "Marcar equipo como retirado",
				icon: Truck,
				className: "bg-neutral-950 text-white hover:bg-neutral-800",
				onClick: actions.lifecycle.openPickup,
			};
		case "return":
			return {
				label: "Marcar equipo como devuelto",
				icon: RotateCcw,
				className: "bg-neutral-950 text-white hover:bg-neutral-800",
				onClick: actions.lifecycle.openReturn,
			};
		default:
			return null;
	}
}

// ─── Equipment ────────────────────────────────────────────────────────────────

function OrderEquipmentSection({
	onPrepareAccessories,
}: {
	onPrepareAccessories: () => void;
}) {
	return (
		<div className="space-y-8">
			<div>
				<EquipmentSectionHeader onPrepareAccessories={onPrepareAccessories} />
				<OrderItemsList />
			</div>
			<ActivityLog />
		</div>
	);
}

function EquipmentSectionHeader({
	onPrepareAccessories,
}: {
	onPrepareAccessories: () => void;
}) {
	const { order } = useOrderDetailContext();
	const accessoryActionLabel = hasSavedAccessories(order.items)
		? "Editar accesorios"
		: "Asignar accesorios";

	return (
		<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 className="text-sm font-semibold text-neutral-950">
					Equipos y accesorios
				</h2>
			</div>

			<Button type="button" variant="outline" onClick={onPrepareAccessories}>
				{accessoryActionLabel}
			</Button>
		</div>
	);
}

// ─── Items List ───────────────────────────────────────────────────────────────

function OrderItemsList() {
	const { order } = useOrderDetailContext();
	const groupedItems = getGroupedOrderItems(order.items);

	return (
		<section className="mb-10 space-y-3">
			{groupedItems.map((item) => (
				<OrderItemCard key={item.key} item={item} />
			))}
		</section>
	);
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function OrderItemCard({ item }: { item: GroupedOrderItem }) {
	const productImage = buildR2PublicUrl(item.imageUrl, "catalog");

	return (
		<div className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 sm:grid-cols-[1fr_auto]">
			<div className="flex gap-4">
				<div className="flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
					{productImage ? (
						<img
							src={productImage}
							alt={item.name}
							loading="lazy"
							decoding="async"
							className="h-full w-full object-cover"
						/>
					) : (
						<Package className="size-6 text-neutral-300" />
					)}
				</div>
				<div className="flex flex-col gap-0.5 min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-semibold leading-snug text-neutral-950">
							{item.name}
						</span>
					</div>

					<div className="text-xs text-neutral-400 font-semibold">
						<span>Cantidad:</span>{" "}
						<span className="text-sm text-neutral-500">{item.quantity}</span>{" "}
						<span className="text-neutral-500">
							{item.quantity > 1 ? "unidades" : "unidad"}
						</span>
					</div>

					{item.productOwner && (
						<span className="text-[11px] text-neutral-500 flex items-center gap-1">
							<User2Icon className="size-3 shrink-0" />
							{item.productOwner}
						</span>
					)}

					{item.bundleExternalOwners.map((entry) => (
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

					{item.bundleSummary && (
						<span className="text-[11px] text-neutral-500 font-medium">
							Bundle: {item.bundleSummary}
						</span>
					)}

					<SerialNumberGroups groups={item.serialGroups} />

					{item.savedAccessories.length > 0 ? (
						<div className="mt-2 space-y-1.5 rounded-md border border-neutral-200 bg-white px-3 py-2">
							<p className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-400">
								Accesorios guardados
							</p>
							<div className="space-y-1.5">
								{item.savedAccessories.map((accessory) => (
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

			<div className="flex items-start justify-end">
				<span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
					{item.type === "BUNDLE" ? "Combo" : "Producto"}
				</span>
			</div>
		</div>
	);
}

function SerialNumberGroups({ groups }: { groups: SerialNumberGroup[] }) {
	if (groups.length === 0) {
		return (
			<span className="font-mono text-[11px] text-neutral-400">
				Sin series asignadas
			</span>
		);
	}

	return (
		<div className="mt-2 space-y-1.5">
			<p className="text-xs text-neutral-400">Nº de serie</p>

			{groups.map((group) => (
				<div key={group.label ?? "serials"} className="flex flex-wrap gap-1.5">
					{group.label ? (
						<span className="mr-1 text-[11px] font-medium text-neutral-500">
							{group.label}
						</span>
					) : null}
					{group.serialNumbers.map((serialNumber) => (
						<span
							key={serialNumber}
							className="rounded-sm border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-xs text-neutral-600 font-semibold"
						>
							{serialNumber}
						</span>
					))}
				</div>
			))}
		</div>
	);
}

type GroupedOrderItem = {
	key: string;
	type: OrderDetailItem["type"];
	name: string;
	imageUrl: string | null;
	quantity: number;
	serialGroups: SerialNumberGroup[];
	bundleSummary: string | null;
	productOwner: string | null;
	bundleExternalOwners: ReturnType<typeof getExternalOwnersByProductType>;
	savedAccessories: ProductOrderDetailItem["accessories"];
};

type SerialNumberGroup = {
	label: string | null;
	serialNumbers: string[];
};

function getGroupedOrderItems(items: OrderDetailItem[]): GroupedOrderItem[] {
	const groups = new Map<string, OrderDetailItem[]>();

	for (const item of items) {
		const key = getOrderItemGroupKey(item);
		groups.set(key, [...(groups.get(key) ?? []), item]);
	}

	return [...groups.entries()].map(([key, groupItems]) => {
		const firstItem = groupItems[0];
		if (!firstItem) {
			throw new Error("Cannot render an empty order item group.");
		}
		const assets = groupItems.flatMap((item) => item.assets);

		return {
			key,
			type: firstItem.type,
			name: firstItem.name,
			imageUrl: firstItem.imageUrl,
			quantity: groupItems.reduce((total, item) => total + getItemQty(item), 0),
			serialGroups: getGroupedSerialNumbers(groupItems),
			bundleSummary:
				firstItem.type === "BUNDLE" ? getBundleSummary(firstItem) : null,
			productOwner:
				firstItem.type === "PRODUCT" ? getOwnerDisplay(assets) : null,
			bundleExternalOwners:
				firstItem.type === "BUNDLE"
					? getGroupedBundleExternalOwners(groupItems)
					: [],
			savedAccessories: groupItems.flatMap((item) => getSavedAccessories(item)),
		};
	});
}

function getOrderItemGroupKey(item: OrderDetailItem): string {
	return item.type === "PRODUCT"
		? `PRODUCT:${item.productTypeId}`
		: `BUNDLE:${item.bundleId}`;
}

function getGroupedSerialNumbers(
	items: OrderDetailItem[],
): SerialNumberGroup[] {
	const firstItem = items[0];
	if (!firstItem) {
		return [];
	}

	if (firstItem.type === "PRODUCT") {
		const serialNumbers = uniqueSerialNumbers(
			items.flatMap((item) => item.assets.map((asset) => asset.serialNumber)),
		);

		return serialNumbers.length > 0 ? [{ label: null, serialNumbers }] : [];
	}

	const componentNameByProductTypeId = new Map(
		firstItem.components.map((component) => [
			component.productTypeId,
			component.productTypeName,
		]),
	);
	const serialsByComponent = new Map<string, Set<string>>();

	for (const item of items) {
		for (const asset of item.assets) {
			if (!asset.serialNumber) continue;

			const label = componentNameByProductTypeId.get(asset.productTypeId);
			if (!label) continue;

			const serialNumbers = serialsByComponent.get(label) ?? new Set<string>();
			serialNumbers.add(asset.serialNumber);
			serialsByComponent.set(label, serialNumbers);
		}
	}

	return [...serialsByComponent.entries()].map(([label, serialNumbers]) => ({
		label,
		serialNumbers: [...serialNumbers],
	}));
}

function getGroupedBundleExternalOwners(
	items: OrderDetailItem[],
): ReturnType<typeof getExternalOwnersByProductType> {
	const ownerNamesByProductType = new Map<string, Set<string>>();

	for (const item of items) {
		for (const owner of getExternalOwnersByProductType(item)) {
			const ownerNames =
				ownerNamesByProductType.get(owner.productTypeName) ?? new Set<string>();
			for (const name of owner.ownerNames.split(", ").filter(Boolean)) {
				ownerNames.add(name);
			}
			ownerNamesByProductType.set(owner.productTypeName, ownerNames);
		}
	}

	return [...ownerNamesByProductType.entries()].map(
		([productTypeName, ownerNames]) => ({
			productTypeName,
			ownerNames: [...ownerNames].join(", "),
		}),
	);
}

function uniqueSerialNumbers(values: Array<string | null>): string[] {
	return [
		...new Set(values.filter((value): value is string => Boolean(value))),
	];
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

function isProductOrderItem(
	item: OrderDetailItem,
): item is ProductOrderDetailItem {
	return item.type === "PRODUCT";
}

function getProductImagesByOrderItemId(
	items: OrderDetailItem[],
): Record<string, string | null> {
	return Object.fromEntries(
		items
			.filter(isProductOrderItem)
			.map((item) => [item.id, buildR2PublicUrl(item.imageUrl, "catalog")]),
	);
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
			<SidebarCardHeader
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
			/>

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
		order.signing.signedAt ??
		order.signing.expiresAt ??
		order.signing.createdAt;

	return (
		<section className="bg-white border border-neutral-200 rounded-lg p-5">
			<button
				type="button"
				onClick={() => setIsExpanded((previous) => !previous)}
				className="flex w-full items-start justify-between gap-4 text-left"
			>
				<div className="min-w-0 flex-1">
					<SidebarCardHeader
						icon={<FileSignature className="size-4" />}
						title="Firma del contrato"
					/>
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
			<SidebarCardHeader
				icon={<Truck className="size-4" />}
				title="Logística"
			/>

			<div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-4">
				<div>
					<p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">
						Fecha de retiro
					</p>
					<p className="text-sm font-medium text-neutral-900">
						{bookingSnapshot.pickupDate.format("MMM DD, YYYY")}
						<span className="text-neutral-400 mx-1">·</span>
						{pickupAt.tz(bookingSnapshot.timezone).format("HH:mm")}
					</p>
				</div>
				<div>
					<p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">
						Fecha de devolución
					</p>
					<p className="text-sm font-medium text-neutral-900">
						{bookingSnapshot.returnDate.format("MMM DD, YYYY")}
						<span className="text-neutral-400 mx-1">·</span>
						{returnAt.tz(bookingSnapshot.timezone).format("HH:mm")}
					</p>
				</div>
			</div>

			<div className="border-t border-neutral-100 pt-3">
				<p className="text-xs text-neutral-400 mb-1.5">
					{fulfillmentMethod === FulfillmentMethod.DELIVERY
						? "Solicitó delivery"
						: "Retiro en punto de entrega"}
				</p>
				<div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
					<MapPin className="size-3.5 text-neutral-400 shrink-0" />
					{location.name}
				</div>
			</div>

			{deliveryRequest && (
				<div className="border-t border-neutral-100 mt-3 pt-3">
					<p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-2">
						Pedido de Delivery
					</p>
					<div className="space-y-1 text-sm text-neutral-700">
						<p className="font-medium text-neutral-900">
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
							<p className="text-neutral-500 pt-1">
								{deliveryRequest.instructions}
							</p>
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

function SidebarCardHeader({
	icon,
	title,
	action,
}: {
	icon: React.ReactNode;
	title: string;
	action?: React.ReactNode;
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
