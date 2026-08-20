import type { EventApi, EventInput } from "@fullcalendar/core";
import dayjs from "@/lib/dates/dayjs";
import type { ParsedRentalsCalendarItem } from "@/modules/rentals/rental.queries";
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
	from: string;
	to: string;
	title: string;
	view: OrdersCalendarView;
	date: string;
};

export type OrdersCalendarEventProps = {
	order: ParsedRentalsCalendarItem;
};

export type OrdersCalendarEventGeometry = {
	startDate: string;
	exclusiveEndDate: string;
	startFraction: number;
	finalOccupiedDate: string;
	finalFraction: number;
};

export type OrdersCalendarEventGeometryInput = Pick<
	ParsedRentalsCalendarItem,
	"pickupAt" | "returnAt" | "pickupDate" | "returnDate"
>;

export const DEFAULT_ORDERS_CALENDAR_VIEW: OrdersCalendarView = "dayGridMonth";

export const ORDERS_CALENDAR_VIEW_LABELS: Record<OrdersCalendarView, string> = {
	dayGridDay: "Dia",
	dayGridWeek: "Semana",
	dayGridMonth: "Mes",
};

export function getDefaultOrdersCalendarDate(timezone: string): string {
	return dayjs().tz(timezone).format("YYYY-MM-DD");
}

export function getInclusiveCalendarRange(
	startStr: string,
	exclusiveEndStr: string,
): Pick<OrdersCalendarRange, "from" | "to"> {
	return {
		from: startStr.slice(0, 10),
		to: dayjs
			.utc(exclusiveEndStr.slice(0, 10))
			.subtract(1, "day")
			.format("YYYY-MM-DD"),
	};
}

export function toOrdersCalendarEvent(
	order: ParsedRentalsCalendarItem,
	timezone: string,
): EventInput {
	const geometry = getOrdersCalendarEventGeometry(order, timezone);

	return {
		id: order.id,
		start: geometry.startDate,
		end: geometry.exclusiveEndDate,
		allDay: true,
		title: getOrdersCalendarEventTitle(order),
		extendedProps: {
			order,
		},
	};
}

export function getOrdersCalendarEventGeometry(
	order: OrdersCalendarEventGeometryInput,
	timezone: string,
): OrdersCalendarEventGeometry {
	const pickupMinutes = getLocalClockMinutes(order.pickupAt, timezone);
	const returnMinutes = getLocalClockMinutes(order.returnAt, timezone);
	const isReturnAtMidnight = returnMinutes === 0;

	return {
		startDate: toCalendarDateToken(order.pickupDate),
		exclusiveEndDate: toCalendarDateToken(
			isReturnAtMidnight ? order.returnDate : order.returnDate.add(1, "day"),
		),
		startFraction: pickupMinutes / MINUTES_PER_DAY,
		finalOccupiedDate: toCalendarDateToken(
			isReturnAtMidnight
				? order.returnDate.subtract(1, "day")
				: order.returnDate,
		),
		finalFraction: isReturnAtMidnight ? 1 : returnMinutes / MINUTES_PER_DAY,
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
		? `#${formatOrderNumber(order.rentalNumber)} ${label}`
		: `#${formatOrderNumber(order.rentalNumber)}`;
}

export function formatOrdersCalendarTooltipDateTime(
	value: ParsedRentalsCalendarItem["pickupAt"],
	timezone: string,
): string {
	return value.tz(timezone).format("ddd D MMM, HH:mm");
}

const MINUTES_PER_DAY = 24 * 60;

function getLocalClockMinutes(
	value: ParsedRentalsCalendarItem["pickupAt"],
	timezone: string,
): number {
	const localValue = value.tz(timezone);
	return (
		localValue.hour() * 60 +
		localValue.minute() +
		localValue.second() / 60 +
		localValue.millisecond() / 60_000
	);
}

function toCalendarDateToken(
	value: ParsedRentalsCalendarItem["pickupDate"],
): string {
	return value.format("YYYY-MM-DD");
}
