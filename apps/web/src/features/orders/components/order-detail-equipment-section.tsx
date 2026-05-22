import { Clock, Package, User2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { useOrderDetailContext } from "@/features/orders/contexts/order-detail.context";
import {
	getGroupedOrderItems,
	hasSavedAccessories,
} from "@/features/orders/order-detail.utils";
import type {
	GroupedOrderItem,
	ProductOrderDetailItem,
	SerialNumberGroup,
} from "@/features/orders/types/order-detail.types";

export function OrderEquipmentSection({
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
