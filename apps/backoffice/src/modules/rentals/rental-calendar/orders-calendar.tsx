import "./orders-calendar.css";

import type {
	DatesSetArg,
	EventClickArg,
	EventContentArg,
	EventMountArg,
} from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
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
import { useOrdersCalendarDayGridGeometry } from "./use-orders-calendar-daygrid-geometry";

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
	const calendarRef = useRef<FullCalendar | null>(null);
	const eventCleanupRef = useRef(new Map<HTMLElement, () => void>());
	const [title, setTitle] = useState("");
	const { calendarShellRef, registerEventSegment, unregisterEventSegment } =
		useOrdersCalendarDayGridGeometry({ timezone });

	function handleDatesSet(arg: DatesSetArg) {
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

	function handleEventClick(arg: EventClickArg) {
		arg.jsEvent.preventDefault();
		onOrderClick(arg.event.id);
	}

	function handleEventDidMount(arg: EventMountArg) {
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
		registerEventSegment(arg);
	}

	function handleEventWillUnmount(arg: EventMountArg) {
		const cleanup = eventCleanupRef.current.get(arg.el);
		cleanup?.();
		eventCleanupRef.current.delete(arg.el);
		unregisterEventSegment(arg);
	}

	function handleViewChange(nextView: OrdersCalendarView) {
		calendarRef.current?.getApi().changeView(nextView);
	}

	const events = orders.map((order) => toOrdersCalendarEvent(order, timezone));

	return (
		<div className="space-y-5">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-wrap items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => calendarRef.current?.getApi().today()}
					>
						Hoy
					</Button>
					<div className="flex items-center rounded-md border border-neutral-200 bg-white">
						<Button
							variant="ghost"
							size="icon-sm"
							className="rounded-r-none"
							onClick={() => calendarRef.current?.getApi().prev()}
						>
							<ChevronLeft className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							className="rounded-l-none border-l border-neutral-200"
							onClick={() => calendarRef.current?.getApi().next()}
						>
							<ChevronRight className="size-4" />
						</Button>
					</div>
					<div className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-900">
						<CalendarDays className="size-4 text-neutral-500" />
						<span>{title}</span>
					</div>
				</div>

				<div className="inline-flex w-fit rounded-md border border-neutral-200 bg-white p-1">
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
								"rounded-[10px] px-3 py-1.5 text-sm font-medium transition-colors",
								currentView === view
									? "bg-neutral-900 text-white"
									: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
							)}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			{isError ? (
				<div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 px-4 py-10 text-sm text-red-700">
					<AlertCircle className="mr-2 size-4" />
					No pudimos cargar los pedidos de este rango.
				</div>
			) : (
				<div
					ref={calendarShellRef}
					className="orders-calendar-shell relative overflow-hidden rounded-2xl border border-neutral-200 bg-white"
				>
					{isFetching || isLoading ? (
						<div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1 overflow-hidden bg-transparent">
							<div className="h-full w-full animate-pulse bg-neutral-900/70" />
						</div>
					) : null}

					<FullCalendar
						key={`${currentView}:${currentDate}:${timezone}`}
						ref={calendarRef}
						plugins={[dayGridPlugin, interactionPlugin]}
						initialView={currentView}
						initialDate={currentDate}
						headerToolbar={false}
						locale={esLocale}
						timeZone={timezone}
						firstDay={1}
						height="auto"
						fixedWeekCount={false}
						dayMaxEvents={3}
						moreLinkClick="popover"
						events={events}
						eventDisplay="block"
						nowIndicator={true}
						now={new Date().toISOString()}
						datesSet={handleDatesSet}
						eventClick={handleEventClick}
						eventDidMount={handleEventDidMount}
						eventWillUnmount={handleEventWillUnmount}
						eventContent={(arg) => <CalendarEventContent arg={arg} />}
						eventClassNames={(arg) => {
							const order = getOrdersCalendarEventOrder(arg.event);
							const statusPresentation = getRentalOrderStatusPresentation(
								order,
								dayjs(),
							);

							return [
								"orders-calendar-event",
								statusPresentation.calendarEventClassName,
							];
						}}
					/>
				</div>
			)}

			<div className="flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
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
		<div className="inline-flex items-center gap-2">
			<span className={cn("h-2.5 w-2.5 rounded-full", colorClass)} />
			<span className="font-medium">{label}</span>
		</div>
	);
}

function CalendarEventContent({ arg }: { arg: EventContentArg }) {
	const order = getOrdersCalendarEventOrder(arg.event);

	return (
		<div className="min-w-0 px-1.5 py-1">
			<p className="truncate font-mono text-[11px] uppercase tracking-[0.08em] opacity-70">
				#{formatOrderNumber(order.rentalNumber)}
			</p>
			<p className="truncate text-sm font-medium">
				{order.customer?.displayName ?? "Pedido"}
			</p>
		</div>
	);
}
