import type { EventApi, EventInput } from "@fullcalendar/react";
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

type OrdersCalendarEventRange = {
	startDate: string;
	exclusiveEndDate: string;
};

type OrdersCalendarEventRangeInput = Pick<
	ParsedRentalsCalendarItem,
	"returnAt" | "pickupDate" | "returnDate"
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
	const range = getOrdersCalendarEventRange(order, timezone);

	return {
		id: order.id,
		start: range.startDate,
		end: range.exclusiveEndDate,
		allDay: true,
		title: getOrdersCalendarEventTitle(order),
		extendedProps: {
			order,
		},
	};
}

export function getOrdersCalendarEventRange(
	order: OrdersCalendarEventRangeInput,
	timezone: string,
): OrdersCalendarEventRange {
	return {
		startDate: toCalendarDateToken(order.pickupDate),
		exclusiveEndDate: toCalendarDateToken(
			isLocalMidnight(order.returnAt, timezone)
				? order.returnDate
				: order.returnDate.add(1, "day"),
		),
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

function isLocalMidnight(
	value: ParsedRentalsCalendarItem["returnAt"],
	timezone: string,
): boolean {
	const localValue = value.tz(timezone);
	return (
		localValue.hour() === 0 &&
		localValue.minute() === 0 &&
		localValue.second() === 0 &&
		localValue.millisecond() === 0
	);
}

function toCalendarDateToken(
	value: ParsedRentalsCalendarItem["pickupDate"],
): string {
	return value.format("YYYY-MM-DD");
}
