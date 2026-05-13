import { OrderStatus } from "@repo/types";
import { CheckCircle2, Clock, Package, RotateCcw, Truck } from "lucide-react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { useOrderDetailContext } from "@/features/orders/contexts/order-detail.context";
import {
	formatMoney,
	getBundleSummary,
	getExternalOwnersByProductType,
	getItemQty,
	getOwnerDisplay,
	type ExternalOwnerEntry,
} from "@/features/orders/order.utils";
import type {
	GroupedOrderItem,
	OrderDetailItem,
	ProductOrderDetailItem,
	SerialNumberGroup,
	StepKey,
	TimelineStep,
} from "@/features/orders/types/order-detail.types";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";

export const TERMINAL_STATUSES = new Set([
	OrderStatus.COMPLETED,
	OrderStatus.CANCELLED,
	OrderStatus.REJECTED,
	OrderStatus.EXPIRED,
]);

// ─── Timeline ─────────────────────────────────────────────────────────────────

export function stepState(
	isDone: boolean,
	key: StepKey,
	currentStep: StepKey | null,
): TimelineStep["state"] {
	if (isDone) return "completed";
	if (currentStep === key) return "current";
	return "pending";
}

export function getTimelineSteps(
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

// ─── Timeline style maps ─────────────────────────────────────────────────────

export const dotStyles: Record<TimelineStep["state"], string> = {
	completed: "bg-neutral-950",
	current:
		"bg-neutral-950 ring-[3px] ring-offset-[1.5px] ring-neutral-950 ring-offset-white",
	pending: "border border-neutral-300 bg-transparent",
};

export const labelStyles: Record<TimelineStep["state"], string> = {
	completed: "text-neutral-500 font-medium",
	current: "text-neutral-950 font-bold",
	pending: "text-neutral-400 font-normal",
};

// ─── Header banner ────────────────────────────────────────────────────────────

export function getOrderHeaderBannerIcon(
	tone: import("@/features/orders/order.utils").OrderHeaderBannerTone,
	primaryAction: "confirm" | "pickup" | "return" | null,
) {
	if (primaryAction === "pickup") return Truck;
	if (primaryAction === "return") return RotateCcw;
	if (primaryAction === "confirm") return Package;
	if (tone === "success") return CheckCircle2;
	if (tone === "danger") return Clock;
	return Package;
}

export function getOrderHeaderPrimaryButtonConfig(
	action: "confirm" | "pickup" | "return" | null,
	orderStatus: OrderStatus,
	actions: ReturnType<typeof useOrderDetailContext>["actions"],
) {
	switch (action) {
		case "confirm":
			return {
				label:
					orderStatus === OrderStatus.PENDING_REVIEW
						? "Aprobar solicitud"
						: "Confirmar pedido",
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

// ─── Item grouping ────────────────────────────────────────────────────────────

export function getGroupedOrderItems(items: OrderDetailItem[]): GroupedOrderItem[] {
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

export function getOrderItemGroupKey(item: OrderDetailItem): string {
	return item.type === "PRODUCT"
		? `PRODUCT:${item.productTypeId}`
		: `BUNDLE:${item.bundleId}`;
}

export function getGroupedSerialNumbers(
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

export function getGroupedBundleExternalOwners(
	items: OrderDetailItem[],
): ExternalOwnerEntry[] {
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

export function uniqueSerialNumbers(values: Array<string | null>): string[] {
	return [
		...new Set(values.filter((value): value is string => Boolean(value))),
	];
}

// ─── Accessories ──────────────────────────────────────────────────────────────

export function getSavedAccessories(item: OrderDetailItem) {
	return isProductOrderItem(item) ? item.accessories : [];
}

export function hasSavedAccessories(items: OrderDetailItem[]) {
	return items.some((item) => getSavedAccessories(item).length > 0);
}

export function isProductOrderItem(
	item: OrderDetailItem,
): item is ProductOrderDetailItem {
	return item.type === "PRODUCT";
}

export function getProductImagesByOrderItemId(
	items: OrderDetailItem[],
): Record<string, string | null> {
	return Object.fromEntries(
		items
			.filter(isProductOrderItem)
			.map((item) => [item.id, buildR2PublicUrl(item.imageUrl, "catalog")]),
	);
}

// ─── Signing ──────────────────────────────────────────────────────────────────

export function getSigningStatusMeta(
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

export function formatSigningDate(
	value: NonNullable<ParsedOrderDetailResponseDto["signing"]["expiresAt"]>,
) {
	return value.format("DD MMM, YYYY · HH:mm");
}

export function formatOptionalSigningDate(
	value:
		| ParsedOrderDetailResponseDto["signing"]["createdAt"]
		| ParsedOrderDetailResponseDto["signing"]["signedAt"]
		| ParsedOrderDetailResponseDto["signing"]["expiresAt"],
) {
	return value ? formatSigningDate(value) : "Sin registro";
}

// ─── Money ────────────────────────────────────────────────────────────────────

export function formatSignedMoney(amount: string): string {
	const value = Number(amount);

	if (Number.isNaN(value)) {
		return formatMoney(amount);
	}

	if (value === 0) {
		return formatMoney(amount);
	}

	return `${value > 0 ? `+` : `-`}${formatMoney(String(Math.abs(value)))}`;
}
