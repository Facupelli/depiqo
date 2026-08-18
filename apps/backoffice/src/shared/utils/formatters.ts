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
