import type { Dayjs } from "dayjs";

export function formatOrderNumber(orderNumber: string | number): string {
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

export function formatExactCurrencyRate(
	amount: string,
	currency: string,
): string {
	// Unit rates are exact authored decimals, not two-decimal payable amounts.
	if (!/^\d+(?:\.\d+)?$/.test(amount)) return `${currency} ${amount}`;
	const [integer, fraction] = amount.split(".");
	try {
		const parts = new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).formatToParts(0);
		const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
		const digits = grouped + (fraction ? `,${fraction}` : "");
		return parts
			.map((part) => (part.type === "integer" ? digits : part.value))
			.join("");
	} catch {
		return `${currency} ${amount}`;
	}
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
