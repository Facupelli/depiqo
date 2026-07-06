import type { Dayjs } from "dayjs";

export function formatOrderNumber(orderNumber: string): string {
	return `ORD-${String(orderNumber).padStart(5, "0")}`;
}

export function formatMoney(amount: string, currency = "ARS"): string {
	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(Number.parseFloat(amount));
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
		return { label: "Hoy", isToday: true, isPast: false, isFuture: false };
	}

	if (diffDays === 1) {
		return { label: "Mañana", isToday: false, isPast: false, isFuture: true };
	}

	if (diffDays === -1) {
		return { label: "Ayer", isToday: false, isPast: true, isFuture: false };
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

export type OrderNextStep = "confirm" | "pickup" | "return" | null;

export type OrderPrimaryAdminAction = {
	action: OrderNextStep;
	label: string;
	description: string;
};

export function getOrderPrimaryAdminAction(
	status: string,
): OrderPrimaryAdminAction | null {
	switch (status) {
		case "draft":
		case "DRAFT":
			return {
				action: "confirm",
				label: "Confirmar pedido",
				description: "Usa los precios guardados",
			};
		case "pending_review":
		case "PENDING_REVIEW":
			return {
				action: "confirm",
				label: "Aprobar solicitud",
				description: "Validar disponibilidad y reservar ahora",
			};
		case "confirmed":
		case "CONFIRMED":
			return {
				action: "pickup",
				label: "Marcar equipo retirado",
				description: "Seguimiento interno",
			};
		case "active":
		case "ACTIVE":
			return {
				action: "return",
				label: "Marcar equipo devuelto",
				description: "Seguimiento interno",
			};
		default:
			return null;
	}
}
