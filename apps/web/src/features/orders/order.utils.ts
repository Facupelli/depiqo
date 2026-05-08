import { OrderItemType, OrderStatus } from "@repo/types";
import type { Dayjs } from "dayjs";
import type { ParsedOrderListItem } from "./orders.queries";
import type { ParsedOrderDetailResponseDto } from "./queries/get-order-by-id";

type OrderItem = ParsedOrderDetailResponseDto["items"][number];
type AssetSummary = OrderItem["assets"][number];

export function formatOrderNumber(orderNumber: number): string {
	return `ORD-${String(orderNumber).padStart(5, "0")}`;
}

export function formatMoney(amount: string, currency: string = "ARS"): string {
	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(parseFloat(amount));
}

/**
 * Returns the serial number of the first asset for non-bundle items.
 * Bundles don't have a single serial number, so they return null.
 */
export function getItemSerialNumber(item: OrderItem): string | null {
	if (item.type === OrderItemType.BUNDLE) return null;
	return item.assets[0]?.serialNumber ?? null;
}

/**
 * Returns the quantity of an item, derived from the number of assigned assets.
 * Falls back to 1 for items with no assets yet (e.g. not yet assigned).
 */
export function getItemQty(item: OrderItem): number {
	return item.assets.length || 1;
}

/**
 * Returns a human-readable summary of a bundle's components.
 * Example: "2× Tripod · 1× Light Panel"
 * Returns null for non-bundle items.
 */
export function getBundleSummary(item: OrderItem): string | null {
	if (item.type !== OrderItemType.BUNDLE) return null;
	return item.components
		.map((c) => `${c.quantity}× ${c.productTypeName}`)
		.join(" · ");
}

/**
 * Returns a comma-separated string of unique owner names across all assets.
 * Returns null if no asset has a known owner.
 */
export function getOwnerDisplay(assets: AssetSummary[]): string | null {
	const ownerNames = [
		...new Set(
			assets
				.map((a) => a.ownerName)
				.filter((name): name is string => name !== null),
		),
	];
	return ownerNames.length > 0 ? ownerNames.join(", ") : null;
}

// ─── Bundle ownership ─────────────────────────────────────────────────────────

export type ExternalOwnerEntry = {
	/** The product type name as snapshotted at booking time. */
	productTypeName: string;
	/** Comma-joined unique owner names for this product type within the bundle. */
	ownerNames: string;
};

/**
 * For bundle items, returns one entry per product type that has at least one
 * externally-owned asset. Each entry groups all external owners for that product
 * type into a single display string.
 *
 * Returns an empty array for non-bundle items — use getOwnerDisplay instead.
 *
 * Example output:
 *   [
 *     { productTypeName: "Tripod",      ownerNames: "John Smith" },
 *     { productTypeName: "Light Panel", ownerNames: "Maria García, John Smith" },
 *   ]
 */
export function getExternalOwnersByProductType(
	item: OrderItem,
): ExternalOwnerEntry[] {
	if (item.type !== OrderItemType.BUNDLE) return [];

	// Map productTypeId → productTypeName using the bundle component snapshot.
	// This is snapshot data — safe even if the product type is later renamed.
	const productTypeNameById = new Map(
		item.components.map((c) => [c.productTypeId, c.productTypeName]),
	);

	// Group external owner names by productTypeId.
	const ownersByProductTypeId = new Map<string, Set<string>>();

	for (const asset of item.assets) {
		if (!asset.ownerName) continue; // rental-owned, skip

		const owners = ownersByProductTypeId.get(asset.productTypeId) ?? new Set();
		owners.add(asset.ownerName);
		ownersByProductTypeId.set(asset.productTypeId, owners);
	}

	// Build the final entries, preserving the component declaration order.
	const entries: ExternalOwnerEntry[] = [];

	for (const [productTypeId, owners] of ownersByProductTypeId) {
		const productTypeName = productTypeNameById.get(productTypeId);
		if (!productTypeName) continue; // asset references an unknown component — skip

		entries.push({
			productTypeName,
			ownerNames: [...owners].join(", "),
		});
	}

	return entries;
}

export type RelativeOrderDateContext = {
	label: string;
	isToday: boolean;
	isPast: boolean;
	isFuture: boolean;
};

export function getRelativeOrderDateContext(
	value: Dayjs,
	referenceDate: Dayjs,
): RelativeOrderDateContext {
	const diffDays = value
		.startOf("day")
		.diff(referenceDate.startOf("day"), "day");

	if (diffDays === 0) {
		return {
			label: "Hoy",
			isToday: true,
			isPast: false,
			isFuture: false,
		};
	}

	if (diffDays === 1) {
		return {
			label: "Mañana",
			isToday: false,
			isPast: false,
			isFuture: true,
		};
	}

	if (diffDays === -1) {
		return {
			label: "Ayer",
			isToday: false,
			isPast: true,
			isFuture: false,
		};
	}

	if (diffDays > 1) {
		return {
			label: `En ${diffDays} días`,
			isToday: false,
			isPast: false,
			isFuture: true,
		};
	}

	return {
		label: `Hace ${Math.abs(diffDays)} días`,
		isToday: false,
		isPast: true,
		isFuture: false,
	};
}

export function hasOrderTodayEvent(
	order: Pick<ParsedOrderListItem, "pickupAt" | "returnAt">,
	referenceDate: Dayjs,
): boolean {
	return [order.pickupAt, order.returnAt].some(
		(value) => getRelativeOrderDateContext(value, referenceDate).isToday,
	);
}

export type OrderOperationalPhase =
	| "draft"
	| "pending-pickup"
	| "pickup-overdue"
	| "active"
	| "overdue"
	| "completed"
	| "cancelled"
	| "rejected"
	| "expired";

export type OrderTemporalState =
	| "draft"
	| "pending-review"
	| "upcoming"
	| "active"
	| "overdue"
	| "finished"
	| "cancelled"
	| "rejected"
	| "expired";

export type OrderNextStep = "confirm" | "pickup" | "return" | null;

export type OrderTemporalInsight = {
	state: OrderTemporalState;
	title: string;
	description: string;
	deadline: string;
};

export type OrderNextStepGuidance = {
	step: OrderNextStep;
	label: string;
	description: string;
};

export type OrderPrimaryAdminAction = {
	action: OrderNextStep;
	label: string;
	description: string;
};

export type OrderHeaderBannerTone =
	| "neutral"
	| "info"
	| "warning"
	| "danger"
	| "success"
	| "muted";

export type OrderHeaderBannerConfig = {
	tone: OrderHeaderBannerTone;
	title: string;
	subtitle: string | null;
	meta: string;
	primaryAction: OrderNextStep;
};

export function getOrderOperationalPhase(
	order: Pick<ParsedOrderListItem, "status" | "pickupAt" | "returnAt">,
	referenceDate: Dayjs,
): OrderOperationalPhase {
	switch (order.status) {
		case OrderStatus.DRAFT:
			return "draft";
		case OrderStatus.COMPLETED:
			return "completed";
		case OrderStatus.CANCELLED:
			return "cancelled";
		case OrderStatus.REJECTED:
			return "rejected";
		case OrderStatus.EXPIRED:
			return "expired";
		case OrderStatus.CONFIRMED:
			if (referenceDate.isAfter(order.pickupAt)) {
				return "pickup-overdue";
			}

			return "pending-pickup";
		case OrderStatus.ACTIVE:
			if (referenceDate.isAfter(order.returnAt)) {
				return "overdue";
			}

			return "active";
	}

	return "active";
}

export function getOrderTemporalInsight(
	order: Pick<ParsedOrderDetailResponseDto, "status" | "pickupAt" | "returnAt">,
	referenceDate: Dayjs,
	timezone: string,
): OrderTemporalInsight {
	switch (order.status) {
		case OrderStatus.DRAFT:
			return {
				state: "draft",
				title: "Borrador",
				description: "Este pedido todavía no ingresó al flujo operativo.",
				deadline: "Pendiente de confirmación",
			};
		case OrderStatus.PENDING_REVIEW:
			return {
				state: "pending-review",
				title: "Pendiente de revisión",
				description: "Este pedido espera aprobación antes de pasar a operación.",
				deadline: "Pendiente de confirmación",
			};
		case OrderStatus.CANCELLED:
			return {
				state: "cancelled",
				title: "Cancelado",
				description: "Este pedido ya no requiere gestión operativa.",
				deadline: "Pedido cancelado",
			};
		case OrderStatus.REJECTED:
			return {
				state: "rejected",
				title: "Rechazado",
				description: "El pedido fue rechazado y no seguirá avanzando.",
				deadline: "Pedido rechazado",
			};
		case OrderStatus.EXPIRED:
			return {
				state: "expired",
				title: "Expirado",
				description: "El pedido venció antes de completarse.",
				deadline: "Reserva vencida",
			};
		case OrderStatus.COMPLETED:
			return {
				state: "finished",
				title: "Finalizado",
				description: "El pedido ya fue devuelto y cerrado.",
				deadline: `Devuelto ${formatRelativeDistance(referenceDate.diff(order.returnAt, "minute"), true)}`,
			};
	}

	if (referenceDate.isBefore(order.pickupAt)) {
		return {
			state: "upcoming",
			title: "Próximo a iniciar",
			description: `${formatRelativeStartLabel(order.pickupAt, referenceDate)}.`,
			deadline: `Retiro ${formatOrderDateTime(order.pickupAt, timezone)}`,
		};
	}

	if (referenceDate.isAfter(order.returnAt)) {
		return {
			state: "overdue",
			title: "Atrasado",
			description: `${formatRelativeOverdueLabel(order.returnAt, referenceDate)}.`,
			deadline: `Debía volver ${formatOrderDateTime(order.returnAt, timezone)}`,
		};
	}

	return {
		state: "active",
		title: "Activo",
		description: `${formatRelativeDueLabel(order.returnAt, referenceDate)}.`,
		deadline: `Devolver ${formatOrderDateTime(order.returnAt, timezone)}`,
	};
}

export function getOrderNextStepGuidance(
	status: OrderStatus,
): OrderNextStepGuidance {
	switch (status) {
		case OrderStatus.DRAFT:
			return {
				step: null,
				label: "Borrador en preparación",
				description:
					"Completa los datos del pedido y confírmalo cuando pase al flujo operativo.",
			};
		case OrderStatus.PENDING_REVIEW:
			return {
				step: "confirm",
				label: "Próximo paso: confirmar pedido",
				description:
					"Revisa el pedido y confírmalo para dejarlo listo para operación.",
			};
		case OrderStatus.CONFIRMED:
			return {
				step: "pickup",
				label: "Próximo paso: marcar retiro",
				description:
					"Cuando el cliente retire el equipo, regístralo para iniciar el alquiler.",
			};
		case OrderStatus.ACTIVE:
			return {
				step: "return",
				label: "Próximo paso: marcar devolución",
				description:
					"Cuando el equipo vuelva, completa la devolución para cerrar el pedido.",
			};
		case OrderStatus.COMPLETED:
			return {
				step: null,
				label: "Pedido cerrado",
				description: "No hay acciones operativas pendientes para este pedido.",
			};
		case OrderStatus.CANCELLED:
			return {
				step: null,
				label: "Pedido cancelado",
				description: "No hay acciones operativas pendientes para este pedido.",
			};
		case OrderStatus.REJECTED:
			return {
				step: null,
				label: "Pedido rechazado",
				description: "No hay acciones operativas pendientes para este pedido.",
			};
		case OrderStatus.EXPIRED:
			return {
				step: null,
				label: "Pedido expirado",
				description: "No hay acciones operativas pendientes para este pedido.",
			};
		default:
			return {
				step: null,
				label: "Sin siguiente paso",
				description: "No pudimos determinar la próxima acción operativa.",
			};
	}
}

export function getOrderPrimaryAdminAction(
	status: OrderStatus,
): OrderPrimaryAdminAction | null {
	switch (status) {
		case OrderStatus.DRAFT:
			return {
				action: "confirm",
				label: "Confirmar pedido",
				description: "Usa los precios guardados",
			};
		case OrderStatus.PENDING_REVIEW:
			return {
				action: "confirm",
				label: "Confirmar pedido",
				description: "Aprobar pedido",
			};
		case OrderStatus.CONFIRMED:
			return {
				action: "pickup",
				label: "Marcar equipo retirado",
				description: "Seguimiento interno",
			};
		case OrderStatus.ACTIVE:
			return {
				action: "return",
				label: "Marcar equipo devuelto",
				description: "Seguimiento interno",
			};
		default:
			return null;
	}
}

export function getOrderHeaderBannerConfig(
	order: Pick<ParsedOrderDetailResponseDto, "status" | "pickupAt" | "returnAt">,
	referenceDate: Dayjs,
	timezone: string,
): OrderHeaderBannerConfig {
	const localizedNow = referenceDate.tz(timezone);
	const localizedPickupAt = order.pickupAt.tz(timezone);
	const localizedReturnAt = order.returnAt.tz(timezone);

	switch (order.status) {
		case OrderStatus.DRAFT:
			return {
				tone: "neutral",
				title: "Pedido en borrador",
				subtitle:
					"Todavía no entró en operación. Revisá los datos antes de confirmarlo.",
				meta: "Pendiente de confirmación",
				primaryAction: "confirm",
			};
		case OrderStatus.PENDING_REVIEW:
			return {
				tone: "neutral",
				title: "Pendiente de revisión",
				subtitle:
					"Revisá el pedido y confirmalo para dejarlo listo para el retiro.",
				meta: "Esperando confirmación operativa",
				primaryAction: "confirm",
			};
		case OrderStatus.CONFIRMED:
			if (localizedNow.isAfter(localizedPickupAt)) {
				return {
					tone: "danger",
					title: "Retiro vencido",
					subtitle:
						"La fecha de retiro ya pasó y el pedido sigue sin marcarse como retirado.",
					meta: `Retiro previsto para ${formatOrderDateTime(order.pickupAt, timezone)}`,
					primaryAction: "pickup",
				};
			}

			if (localizedNow.isSame(localizedPickupAt, "day")) {
				return {
					tone: "neutral",
					title: "Retiro hoy",
					subtitle: "El cliente debería retirar el equipo hoy.",
					meta: `Retiro previsto a las ${formatOrderTime(order.pickupAt, timezone)}`,
					primaryAction: "pickup",
				};
			}

			if (
				localizedPickupAt.startOf("day").diff(localizedNow.startOf("day"), "day") <=
				5
			) {
				return {
					tone: "neutral",
					title: "Retiro próximo",
					subtitle:
						"El pedido está confirmado y listo para entregar cuando llegue el cliente.",
					meta: `Retiro programado para ${formatOrderDateTime(order.pickupAt, timezone)}`,
					primaryAction: "pickup",
				};
			}

			return {
				tone: "neutral",
				title: "Pedido confirmado",
				subtitle:
					"El pedido ya está listo y espera la fecha programada de retiro.",
				meta: `Retiro programado para ${formatOrderDateTime(order.pickupAt, timezone)}`,
				primaryAction: "pickup",
			};
		case OrderStatus.ACTIVE:
			if (localizedNow.isAfter(localizedReturnAt)) {
				return {
					tone: "danger",
					title: "Devolución vencida",
					subtitle:
						"La fecha de devolución ya pasó y seguimos esperando que el cliente entregue el equipo.",
					meta: `Debía devolverse el ${formatOrderDateTime(order.returnAt, timezone)}`,
					primaryAction: "return",
				};
			}

			if (localizedNow.isSame(localizedReturnAt, "day")) {
				return {
					tone: "neutral",
					title: "Devolución hoy",
					subtitle:
						"El pedido está a la espera de devolución durante el día de hoy.",
					meta: `Devolución prevista a las ${formatOrderTime(order.returnAt, timezone)}`,
					primaryAction: "return",
				};
			}

			return {
				tone: "neutral",
				title: "Devolución programada",
				subtitle:
					"El equipo está alquilado y todavía hay margen antes de la devolución.",
				meta: `Devolución prevista para ${formatOrderDateTime(order.returnAt, timezone)}`,
				primaryAction: "return",
			};
		case OrderStatus.COMPLETED:
			return {
				tone: "success",
				title: "Pedido completado",
				subtitle:
					"La devolución ya fue registrada y el flujo operativo quedó cerrado.",
				meta: "Sin acciones operativas pendientes",
				primaryAction: null,
			};
		case OrderStatus.CANCELLED:
			return {
				tone: "danger",
				title: "Pedido cancelado",
				subtitle:
					"Este pedido fue cancelado y ya no sigue en operación.",
				meta: "Sin acciones disponibles",
				primaryAction: null,
			};
		case OrderStatus.REJECTED:
			return {
				tone: "danger",
				title: "Pedido rechazado",
				subtitle:
					"El pedido no fue aprobado y quedó fuera del flujo operativo.",
				meta: "Sin acciones disponibles",
				primaryAction: null,
			};
		case OrderStatus.EXPIRED:
			return {
				tone: "muted",
				title: "Pedido expirado",
				subtitle:
					"La reserva venció antes de iniciar el retiro y ya no sigue en operación.",
				meta: "Sin acciones disponibles",
				primaryAction: null,
			};
		default:
			return {
				tone: "neutral",
				title: "Estado del pedido",
				subtitle: null,
				meta: "Sin acciones disponibles",
				primaryAction: null,
			};
	}
}

function formatRelativeStartLabel(target: Dayjs, referenceDate: Dayjs): string {
	return formatRelativeLabel(target.diff(referenceDate, "minute"), {
		immediate: "Empieza pronto",
		singularDay: "Empieza mañana",
		pluralDay: (value) => `Empieza en ${value} días`,
		singularHour: "Empieza en 1 hora",
		pluralHour: (value) => `Empieza en ${value} horas`,
		singularMinute: "Empieza en 1 minuto",
		pluralMinute: (value) => `Empieza en ${value} minutos`,
	});
}

function formatRelativeDueLabel(target: Dayjs, referenceDate: Dayjs): string {
	return formatRelativeLabel(target.diff(referenceDate, "minute"), {
		immediate: "Vence muy pronto",
		singularDay: "Vence mañana",
		pluralDay: (value) => `Vence en ${value} días`,
		singularHour: "Vence en 1 hora",
		pluralHour: (value) => `Vence en ${value} horas`,
		singularMinute: "Vence en 1 minuto",
		pluralMinute: (value) => `Vence en ${value} minutos`,
	});
}

function formatRelativeOverdueLabel(
	target: Dayjs,
	referenceDate: Dayjs,
): string {
	return formatRelativeLabel(referenceDate.diff(target, "minute"), {
		immediate: "Atrasado hace instantes",
		singularDay: "Atrasado por 1 día",
		pluralDay: (value) => `Atrasado por ${value} días`,
		singularHour: "Atrasado por 1 hora",
		pluralHour: (value) => `Atrasado por ${value} horas`,
		singularMinute: "Atrasado por 1 minuto",
		pluralMinute: (value) => `Atrasado por ${value} minutos`,
	});
}

function formatRelativeDistance(
	minutes: number,
	includeSuffix = false,
): string {
	const normalizedMinutes = Math.abs(minutes);
	let valueLabel = "hace instantes";

	if (normalizedMinutes >= 60 * 24) {
		const days = Math.floor(normalizedMinutes / (60 * 24));
		valueLabel = days === 1 ? "1 día" : `${days} días`;
	} else if (normalizedMinutes >= 60) {
		const hours = Math.floor(normalizedMinutes / 60);
		valueLabel = hours === 1 ? "1 hora" : `${hours} horas`;
	} else if (normalizedMinutes > 0) {
		valueLabel =
			normalizedMinutes === 1 ? "1 minuto" : `${normalizedMinutes} minutos`;
	}

	if (!includeSuffix || valueLabel === "hace instantes") {
		return valueLabel;
	}

	return `hace ${valueLabel}`;
}

function formatOrderDateTime(value: Dayjs, timezone: string): string {
	return `${value.tz(timezone).format("MMM D, YYYY")} · ${value.tz(timezone).format("HH:mm")}`;
}

function formatOrderTime(value: Dayjs, timezone: string): string {
	return value.tz(timezone).format("HH:mm");
}

function formatRelativeLabel(
	minutes: number,
	labels: {
		immediate: string;
		singularDay: string;
		pluralDay: (value: number) => string;
		singularHour: string;
		pluralHour: (value: number) => string;
		singularMinute: string;
		pluralMinute: (value: number) => string;
	},
): string {
	if (minutes <= 0) {
		return labels.immediate;
	}

	const days = Math.floor(minutes / (60 * 24));
	if (days >= 1) {
		return days === 1 ? labels.singularDay : labels.pluralDay(days);
	}

	const hours = Math.floor(minutes / 60);
	if (hours >= 1) {
		return hours === 1 ? labels.singularHour : labels.pluralHour(hours);
	}

	return minutes === 1 ? labels.singularMinute : labels.pluralMinute(minutes);
}
