import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import "./orders-calendar.css";

import FullCalendar, {
	type CalendarRef,
	type DatesSetInfo,
	type EventClickInfo,
	type EventDisplayInfo,
	type MountInfo,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import esLocale from "@fullcalendar/react/locales/es";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import { Button } from "@repo/ui/components/button";
import {
	AlertCircle,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useRef, useState } from "react";
import dayjs from "@/lib/dates/dayjs";
import { cn } from "@/lib/utils";
import type { ParsedGetRentalsCalendarResponse } from "@/modules/rentals/rental.queries";
import {
	getRentalOrderStatusPresentation,
	RENTAL_ORDER_STATUS_LEGEND_ITEMS,
} from "@/modules/rentals/shared/rental-order-status";
import { formatOrderNumber } from "@/shared/utils/formatters";
import {
	getInclusiveCalendarRange,
	getOrdersCalendarEventOrder,
	ORDERS_CALENDAR_VIEW_LABELS,
	type OrdersCalendarRange,
	type OrdersCalendarView,
	toOrdersCalendarEvent,
} from "./orders-calendar.utils";

type OrdersCalendarEventMountInfo = MountInfo<EventDisplayInfo>;

type OrdersCalendarProps = {
	currentDate: string;
	currentView: OrdersCalendarView;
	timezone: string;
	orders: ParsedGetRentalsCalendarResponse;
	isLoading: boolean;
	isFetching: boolean;
	isError: boolean;
	onRangeChange: (range: OrdersCalendarRange) => void;
	onOrderClick: (orderId: string) => void;
};

export function OrdersCalendar({
	currentDate,
	currentView,
	timezone,
	orders,
	isLoading,
	isFetching,
	isError,
	onRangeChange,
	onOrderClick,
}: OrdersCalendarProps) {
	const calendarRef = useRef<CalendarRef | null>(null);
	const eventCleanupRef = useRef(new Map<HTMLElement, () => void>());
	const [title, setTitle] = useState("");

	function handleDatesSet(arg: DatesSetInfo) {
		const calendarApi = arg.view.calendar;
		const anchorDate = calendarApi.getDate();

		setTitle(arg.view.title);
		onRangeChange({
			view: arg.view.type as OrdersCalendarView,
			date: calendarApi.formatIso(anchorDate, true),
			...getInclusiveCalendarRange(arg.startStr, arg.endStr),
			title: arg.view.title,
		});
	}

	function handleEventClick(arg: EventClickInfo) {
		arg.jsEvent.preventDefault();
		onOrderClick(arg.event.id);
	}

	function handleEventDidMount(arg: OrdersCalendarEventMountInfo) {
		arg.el.tabIndex = 0;
		arg.el.setAttribute("role", "button");
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Enter" && event.key !== " ") {
				return;
			}

			event.preventDefault();
			onOrderClick(arg.event.id);
		};

		arg.el.addEventListener("keydown", handleKeyDown);

		eventCleanupRef.current.set(arg.el, () => {
			arg.el.removeEventListener("keydown", handleKeyDown);
		});
	}

	function handleEventWillUnmount(arg: OrdersCalendarEventMountInfo) {
		const cleanup = eventCleanupRef.current.get(arg.el);
		cleanup?.();
		eventCleanupRef.current.delete(arg.el);
	}

	function handleViewChange(nextView: OrdersCalendarView) {
		calendarRef.current?.getApi().changeView(nextView);
	}

	const events = orders.map((order) =>
		toOrdersCalendarEvent(order, timezone, currentView),
	);

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-wrap items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						className="h-9 rounded-lg border-neutral-200 bg-white px-3 shadow-none"
						onClick={() => calendarRef.current?.getApi().today()}
					>
						Hoy
					</Button>
					<div className="flex h-9 items-center overflow-hidden rounded-lg border border-neutral-200 bg-white">
						<Button
							variant="ghost"
							size="icon-sm"
							className="h-full rounded-none"
							onClick={() => calendarRef.current?.getApi().prev()}
						>
							<ChevronLeft className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							className="h-full rounded-none border-l border-neutral-200"
							onClick={() => calendarRef.current?.getApi().next()}
						>
							<ChevronRight className="size-4" />
						</Button>
					</div>
					<div className="inline-flex h-9 min-w-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800">
						<CalendarDays className="size-4 shrink-0 text-neutral-400" />
						<span className="truncate">{title}</span>
					</div>
				</div>

				<div className="flex items-center gap-4">
					<div className="text-right text-xs text-muted-foreground">
						<p>{timezone}</p>
					</div>

					<div className="inline-flex h-9 w-fit rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
						{(
							Object.entries(ORDERS_CALENDAR_VIEW_LABELS) as Array<
								[OrdersCalendarView, string]
							>
						).map(([view, label]) => (
							<button
								key={view}
								type="button"
								onClick={() => handleViewChange(view)}
								className={cn(
									"rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1",
									currentView === view
										? "bg-emerald-600 text-white shadow-sm"
										: "text-neutral-600 hover:bg-white hover:text-neutral-900",
								)}
							>
								{label}
							</button>
						))}
					</div>
				</div>
			</div>

			{isError ? (
				<div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 px-4 py-10 text-sm text-red-700">
					<AlertCircle className="mr-2 size-4" />
					No pudimos cargar los pedidos de este rango.
				</div>
			) : (
				<div className="orders-calendar-shell relative overflow-hidden rounded-2xl border border-neutral-200 bg-white">
					{isFetching || isLoading ? (
						<div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1 overflow-hidden bg-transparent">
							<div className="h-full w-full animate-pulse bg-neutral-900/70" />
						</div>
					) : null}

					<FullCalendar
						key={`${currentView}:${currentDate}:${timezone}`}
						ref={calendarRef}
						plugins={[
							classicThemePlugin,
							dayGridPlugin,
							timeGridPlugin,
							interactionPlugin,
						]}
						initialView={currentView}
						initialDate={currentDate}
						headerToolbar={false}
						locale={esLocale}
						timeZone={timezone}
						firstDay={1}
						height="auto"
						fixedWeekCount={false}
						views={{
							dayGrid: {
								dayMaxEvents: 3,
							},
							timeGrid: {
								allDaySlot: false,
							},
						}}
						slotEventOverlap={false}
						tableClass="orders-calendar-table"
						dayHeaderClass={(info) =>
							info.inPopover
								? "orders-calendar-popover-header"
								: "orders-calendar-day-header"
						}
						dayCellClass={(info) =>
							info.inPopover
								? "orders-calendar-popover-body"
								: cn(
										"orders-calendar-day-cell",
										info.isToday && "orders-calendar-day-cell--today",
									)
						}
						dayCellTopClass={(info) =>
							info.inPopover ? "" : "orders-calendar-day-top"
						}
						dayCellTopInnerClass={(info) =>
							info.inPopover
								? ""
								: cn(
										"orders-calendar-day-number",
										info.isToday && "orders-calendar-day-number--today",
									)
						}
						dayCellInnerClass={(info) =>
							info.inPopover ? "" : "orders-calendar-day-events"
						}
						moreLinkClick="popover"
						moreLinkClass="orders-calendar-more-link"
						moreLinkInnerClass="orders-calendar-more-link-inner"
						popoverClass="orders-calendar-popover"
						events={events}
						eventDisplay="block"
						now={new Date().toISOString()}
						nowIndicator={currentView !== "dayGridMonth"}
						datesSet={handleDatesSet}
						eventClick={handleEventClick}
						eventDidMount={handleEventDidMount}
						eventWillUnmount={handleEventWillUnmount}
						eventContent={(arg) => (
							<CalendarEventContent arg={arg} timezone={timezone} />
						)}
						eventClass={(arg) => {
							const order = getOrdersCalendarEventOrder(arg.event);
							const statusPresentation = getRentalOrderStatusPresentation(
								order,
								dayjs(),
							);

							return cn(
								"orders-calendar-event",
								statusPresentation.calendarEventClassName,
							);
						}}
						rowEventClass={(info) =>
							cn(
								"orders-calendar-row-event",
								info.isStart && "orders-calendar-row-event--start",
								info.isEnd && "orders-calendar-row-event--end",
							)
						}
						rowEventInnerClass="orders-calendar-event-main"
						columnEventClass="orders-calendar-column-event"
						columnEventInnerClass="orders-calendar-event-main orders-calendar-column-event-main"
					/>
				</div>
			)}

			<div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-neutral-200 px-1 pt-3 text-xs text-neutral-500">
				{RENTAL_ORDER_STATUS_LEGEND_ITEMS.map((item) => (
					<LegendItem
						key={item.label}
						colorClass={item.colorClass}
						label={item.label}
					/>
				))}
			</div>
		</div>
	);
}

function LegendItem({
	colorClass,
	label,
}: {
	colorClass: string;
	label: string;
}) {
	return (
		<div className="inline-flex items-center gap-1.5">
			<span className={cn("size-2 rounded-full", colorClass)} />
			<span>{label}</span>
		</div>
	);
}

function CalendarEventContent({
	arg,
	timezone,
}: {
	arg: EventDisplayInfo;
	timezone: string;
}) {
	const order = getOrdersCalendarEventOrder(arg.event);
	const pickupTime = order.pickupAt.tz(timezone).format("HH:mm");
	const returnTime = order.returnAt.tz(timezone).format("HH:mm");
	const isTimeGrid =
		arg.view.type === "timeGridDay" || arg.view.type === "timeGridWeek";

	if (isTimeGrid) {
		const boundaryTime =
			arg.isStart && arg.isEnd
				? `${pickupTime} → ${returnTime}`
				: arg.isStart
					? pickupTime
					: arg.isEnd
						? returnTime
						: null;

		return (
			<div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden px-2 py-1">
				<span className="truncate font-mono text-[10px] uppercase tracking-[0.04em] opacity-60">
					#{formatOrderNumber(order.rentalNumber)}
				</span>
				<span className="break-words text-xs font-semibold leading-tight">
					{order.customer?.displayName ?? "Pedido"}
				</span>
				{boundaryTime ? (
					<span className="text-[9px] leading-none opacity-55">
						{boundaryTime}
					</span>
				) : null}
			</div>
		);
	}

	return (
		<div className="flex min-w-0 flex-1 flex-col justify-center gap-px overflow-hidden px-2 py-0.5">
			<div className="flex min-w-0 items-baseline gap-1.5">
				<span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.04em] opacity-60">
					#{formatOrderNumber(order.rentalNumber)}
				</span>
				<span className="truncate text-xs font-semibold">
					{order.customer?.displayName ?? "Pedido"}
				</span>
			</div>
			<div className="grid min-w-0 grid-cols-2 text-[9px] leading-none opacity-55">
				<span className="truncate">{arg.isStart ? pickupTime : null}</span>
				<span className="truncate text-right">
					{arg.isEnd ? returnTime : null}
				</span>
			</div>
		</div>
	);
}
