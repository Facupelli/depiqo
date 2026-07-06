import type { EventApi, EventInput } from "@fullcalendar/core";
import type { ParsedRentalsCalendarItem } from "@/features/rental-commitment/rentals/rentals.queries";
import dayjs from "@/lib/dates/dayjs";
import { formatOrderNumber } from "@/shared/utils/formatters";

export const ORDERS_CALENDAR_VIEWS = [
	"dayGridDay",
	"dayGridWeek",
	"dayGridMonth",
] as const;

export type OrdersCalendarView = (typeof ORDERS_CALENDAR_VIEWS)[number];

export type OrdersCalendarSearch = {
	view?: OrdersCalendarView;
	date?: string;
};

export type OrdersCalendarRange = {
	rangeStart: string;
	rangeEnd: string;
	title: string;
	view: OrdersCalendarView;
	date: string;
};

export type OrdersCalendarEventProps = {
	order: ParsedRentalsCalendarItem;
};

export const DEFAULT_ORDERS_CALENDAR_VIEW: OrdersCalendarView = "dayGridWeek";

export const ORDERS_CALENDAR_VIEW_LABELS: Record<OrdersCalendarView, string> = {
	dayGridDay: "Dia",
	dayGridWeek: "Semana",
	dayGridMonth: "Mes",
};

export function getDefaultOrdersCalendarDate(timezone: string): string {
	return dayjs().tz(timezone).format("YYYY-MM-DD");
}

export function getCalendarDateParamFromDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function toOrdersCalendarEvent(
	order: ParsedRentalsCalendarItem,
): EventInput {
	return {
		id: order.id,
		// These date-only fields are already derived by the backend in the
		// effective location timezone. Keep using them as canonical all-day
		// calendar bounds instead of recomputing from pickupAt/returnAt.
		start: toCalendarDateToken(order.pickupDate),
		end: toCalendarDateToken(order.returnDate),
		allDay: true,
		title: getOrdersCalendarEventTitle(order),
		extendedProps: {
			order,
		},
	};
}

export function getOrdersCalendarEventOrder(
	event: EventApi,
): ParsedRentalsCalendarItem {
	return (event.extendedProps as OrdersCalendarEventProps).order;
}

export function getOrdersCalendarEventTitle(
	order: ParsedRentalsCalendarItem,
): string {
	const label = order.customer?.displayName?.trim();
	return label
		? `#${formatOrderNumber(order.number)} ${label}`
		: `#${formatOrderNumber(order.number)}`;
}

export function formatOrdersCalendarTooltipDateTime(
	value: ParsedRentalsCalendarItem["pickupAt"],
	timezone: string,
): string {
	return value.tz(timezone).format("ddd D MMM, HH:mm");
}

export function getOrdersCalendarStatusLabel(
	order: ParsedRentalsCalendarItem,
): string {
	return order.status === "CONFIRMED" ? "Activo" : "Pendiente";
}

function toCalendarDateToken(
	value: ParsedRentalsCalendarItem["pickupDate"],
): string {
	return value.format("YYYY-MM-DD");
}
