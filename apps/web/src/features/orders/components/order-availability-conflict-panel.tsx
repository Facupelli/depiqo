import { AlertTriangle, Package, Wrench } from "lucide-react";
import type {
	OrderAvailabilityConflictAffectedItem,
	OrderAvailabilityConflictDisplayModel,
} from "@/features/orders/order-availability-conflict.display-model";

export function OrderAvailabilityConflictPanel({
	model,
}: {
	model: OrderAvailabilityConflictDisplayModel;
}) {
	const hasAnyDetails =
		model.inventoryConflicts.length > 0 ||
		model.accessoryConflicts.length > 0 ||
		model.unavailableItems.length > 0;

	if (!hasAnyDetails) {
		return null;
	}

	return (
		<div className="rounded-xl border border-amber-200 bg-amber-50/70">
			<div className="flex items-start gap-3 border-b border-amber-200 px-4 py-3">
				<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
					<AlertTriangle className="size-4" />
				</div>
				<div>
					<p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">
						Conflictos de disponibilidad
					</p>
					<p className="mt-1 text-sm text-amber-900">
						Parte del equipamiento o los accesorios ya no están disponibles para
						este período.
					</p>
				</div>
			</div>

			<div className="space-y-4 p-4">
				<InventoryConflictSection model={model} />
				<AccessoryConflictSection model={model} />
				<UnavailableItemsSection model={model} />
			</div>
		</div>
	);
}

function InventoryConflictSection({
	model,
}: {
	model: OrderAvailabilityConflictDisplayModel;
}) {
	if (model.inventoryConflicts.length === 0) {
		return null;
	}

	return (
		<section className="space-y-3">
			{model.inventoryConflicts.map((group) => (
				<div
					key={group.key}
					className="rounded-lg border border-amber-200 bg-white p-4"
				>
					<div className="flex items-start gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
							<Package className="size-4" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-semibold text-neutral-950">
								{group.productTypeName}
							</p>
							<p className="mt-1 text-xs font-medium text-amber-800">
								Disponibles: {group.availableCount} · Solicitados: {group.requestedCount}
							</p>
						</div>
					</div>

					<div className="mt-3 space-y-2">
						{group.affectedItems.map((item) => (
							<AffectedItemRow key={item.key} item={item} />
						))}
					</div>
				</div>
			))}
		</section>
	);
}

function AccessoryConflictSection({
	model,
}: {
	model: OrderAvailabilityConflictDisplayModel;
}) {
	if (model.accessoryConflicts.length === 0) {
		return null;
	}

	return (
		<section className="space-y-3">
			<div className="flex items-center gap-2 text-neutral-950">
				<Wrench className="size-4 text-amber-700" />
				<p className="text-sm font-semibold">Accesorios sin disponibilidad</p>
			</div>
			{model.accessoryConflicts.map((entry) => (
				<div
					key={entry.key}
					className="rounded-lg border border-amber-200 bg-white p-4"
				>
					<p className="text-sm font-semibold text-neutral-950">
						{entry.accessoryName}
					</p>
					<p className="mt-1 text-xs font-medium text-amber-800">
						Disponibles: {entry.availableCount} · Solicitados: {entry.requestedCount}
					</p>
					<p className="mt-2 text-xs text-neutral-500">
						Accesorio del equipo <span className="font-medium text-neutral-700">{entry.parentItemName}</span>
					</p>
				</div>
			))}
		</section>
	);
}

function UnavailableItemsSection({
	model,
}: {
	model: OrderAvailabilityConflictDisplayModel;
}) {
	if (model.unavailableItems.length === 0) {
		return null;
	}

	return (
		<section className="space-y-2 rounded-lg border border-amber-200 bg-white p-4">
			<p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">
				Ítems afectados
			</p>
			<div className="space-y-2">
				{model.unavailableItems.map((item) => (
					<AffectedItemRow key={item.key} item={item} />
				))}
			</div>
		</section>
	);
}

function AffectedItemRow({
	item,
}: {
	item: OrderAvailabilityConflictAffectedItem;
}) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
			<div className="min-w-0">
				<p className="truncate text-sm font-medium text-neutral-900">
					{item.label}
				</p>
				<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
					{item.kindLabel}
				</p>
			</div>
			<span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-600">
				x{item.quantity}
			</span>
		</div>
	);
}
