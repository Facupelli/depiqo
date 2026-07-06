import clsx from "clsx";
import { AlertTriangle, Package, Trash2 } from "lucide-react";
import { useV2RentalCartActions } from "@/features/rental-commitment/cart/v2-rental-cart.hooks";
import type { V2RentalCartItem } from "@/features/rental-commitment/cart/v2-rental-cart.types";
import type { ConflictAffectedItem, ConflictGroup } from "../cart.types";
import { useCartBookingContext, useCartContext } from "../cart-page.context";

export function CartPageConflictPanel() {
	const { conflictGroups } = useCartBookingContext();
	const { cartItems } = useCartContext();

	// The panel vanishes entirely once every group is resolved —
	// disappearance is the resolution signal, not a badge inside the panel.
	const hasUnresolvedGroup = conflictGroups.some((group: ConflictGroup) => {
		const currentDemand = computeCurrentDemand(group.affectedItems, cartItems);
		return currentDemand > group.availableCount;
	});

	if (!hasUnresolvedGroup) return null;

	return (
		<div className="border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50">
			{/* Panel header */}
			<div className="flex items-start gap-3 border-b border-amber-200 px-5 py-4">
				<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
				<div>
					<p className="text-xs font-black uppercase tracking-widest text-amber-800">
						Conflicto de disponibilidad
					</p>
					<p className="mt-0.5 text-[11px] text-amber-700">
						Algunos equipos se solicitan más veces de las unidades físicas
						disponibles. Ajusta tu pedido para continuar.
					</p>
				</div>
			</div>

			{/* One card per conflict group */}
			<div className="divide-y divide-amber-200">
				{conflictGroups.map((group: ConflictGroup) => (
					<ConflictGroupCard key={group.productTypeId} group={group} />
				))}
			</div>
		</div>
	);
}

// ─── Group card ───────────────────────────────────────────────────────────────

type ConflictGroupCardProps = {
	group: ConflictGroup;
};

function ConflictGroupCard({ group }: ConflictGroupCardProps) {
	const { changeRentalOfferQuantity, removeRentalOffer } =
		useV2RentalCartActions();
	const { cartItems } = useCartContext();

	const currentDemand = computeCurrentDemand(group.affectedItems, cartItems);
	const unitsToRemove = Math.max(0, currentDemand - group.availableCount);

	return (
		<div className="px-5 py-4">
			{/* Group header row */}
			<div className="mb-3 flex items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<Package className="h-3.5 w-3.5 shrink-0 text-amber-600" />
					<p className="text-[11px] font-black uppercase tracking-widest text-amber-800">
						{group.availableCount}{" "}
						{group.availableCount === 1
							? "unidad disponible"
							: "unidades disponibles"}{" "}
						— pedido solicita {group.requestedCount}
					</p>
				</div>

				{/* Live demand counter — only shown while still unresolved */}
				{unitsToRemove > 0 && (
					<div>
						<span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
							Quitar {unitsToRemove}{" "}
							{unitsToRemove === 1 ? "unidad más" : "unidades más"}
						</span>
					</div>
				)}
			</div>

			{/* Affected item rows */}
			<div className="space-y-2">
				{group.affectedItems.map((affected) => {
					const cartItem = findCartItem(affected, cartItems);

					// Item was already removed by the customer — don't render a ghost row.
					if (!cartItem) {
						return null;
					}

					return (
						<ConflictAffectedItemRow
							key={affected.productTypeId}
							cartItem={cartItem}
							onRemove={() => removeRentalOffer(cartItem.rentalOfferId)}
							onSetQuantity={(qty) =>
								changeRentalOfferQuantity(cartItem.rentalOfferId, qty)
							}
						/>
					);
				})}
			</div>
		</div>
	);
}

// ─── Affected item row ────────────────────────────────────────────────────────

type ConflictAffectedItemRowProps = {
	cartItem: V2RentalCartItem;
	onRemove: () => void;
	onSetQuantity: (qty: number) => void;
};

function ConflictAffectedItemRow({
	cartItem,
	onRemove,
	onSetQuantity,
}: ConflictAffectedItemRowProps) {
	return (
		<div className="flex items-center gap-4 border border-amber-200 bg-white px-4 py-3">
			{/* Item name + type badge */}
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-bold uppercase tracking-wide text-black">
					{cartItem.name}
				</p>
				<p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
					Producto
				</p>
			</div>

			<div className="shrink-0 flex items-center gap-3">
				<StandaloneQuantityControl
					currentQuantity={cartItem.quantity}
					onSetQuantity={onSetQuantity}
					onRemove={onRemove}
				/>
			</div>
		</div>
	);
}

// ─── Quantity control ────────────────────────────────────────────────────────

type StandaloneQuantityControlProps = {
	currentQuantity: number;
	onSetQuantity: (qty: number) => void;
	onRemove: () => void;
};

function StandaloneQuantityControl({
	currentQuantity,
	onSetQuantity,
	onRemove,
}: StandaloneQuantityControlProps) {
	const handleDecrement = () => {
		if (currentQuantity <= 1) {
			onRemove();
		} else {
			onSetQuantity(currentQuantity - 1);
		}
	};

	return (
		<div className="flex items-center gap-0">
			{/* Decrement / remove button */}
			<button
				type="button"
				onClick={handleDecrement}
				className={clsx(
					"flex h-8 w-8 items-center justify-center border",
					currentQuantity === 1
						? "border-red-300 bg-red-50 text-red-500 hover:bg-red-100"
						: "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50",
					"text-sm font-bold transition-colors",
				)}
				aria-label={currentQuantity === 1 ? "Quitar item" : "Reducir cantidad"}
			>
				{currentQuantity === 1 ? <Trash2 className="h-3 w-3" /> : "−"}
			</button>

			{/* Current quantity display */}
			<div className="flex h-8 w-10 items-center justify-center border-y border-r border-neutral-300 bg-white">
				<span className="text-sm font-black text-black">{currentQuantity}</span>
			</div>

			{/* Increment is intentionally absent during conflict resolution —
          the customer is here to reduce demand, not increase it */}
		</div>
	);
}

// ─── Domain helpers ────────────────────────────────────────────────────────────

/**
 * Given a conflict group's affectedItems and the live cart, compute how many
 * units the cart is currently demanding for this contested product type.
 *
 * Products contribute their full current quantity.
 */
function computeCurrentDemand(
	affectedItems: ConflictAffectedItem[],
	cartItems: V2RentalCartItem[],
): number {
	return affectedItems.reduce((sum, affected) => {
		const cartItem = findCartItem(affected, cartItems);
		return sum + (cartItem?.quantity ?? 0);
	}, 0);
}

/**
 * Find the cart item that corresponds to a ConflictAffectedItem.
 */
function findCartItem(
	affected: ConflictAffectedItem,
	cartItems: V2RentalCartItem[],
): V2RentalCartItem | undefined {
	return cartItems.find(
		(item) => item.rentalOfferId === affected.productTypeId,
	);
}
