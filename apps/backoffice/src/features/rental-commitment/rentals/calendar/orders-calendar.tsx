import "./orders-calendar.css";

import type {
	DatesSetArg,
	EventClickArg,
	EventContentArg,
	EventHoveringArg,
	EventMountArg,
} from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { Button } from "@repo/ui/components/button";
import { Popover, PopoverContent } from "@repo/ui/components/popover";
import {
	AlertCircle,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	CircleUserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	getRentalOrderStatusPresentation,
	RENTAL_ORDER_STATUS_LEGEND_ITEMS,
} from "@/features/rental-commitment/rentals/rental-order-status";
import type {
	ParsedGetRentalsCalendarResponse,
	ParsedRentalsCalendarItem,
} from "@/features/rental-commitment/rentals/rentals.queries";
import dayjs from "@/lib/dates/dayjs";
import { cn } from "@/lib/utils";
import { formatOrderNumber } from "@/shared/utils/formatters";
import {
	formatOrdersCalendarTooltipDateTime,
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

type ActivePopover = {
	eventId: string;
	anchorEl: HTMLElement;
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
	const closeTimeoutRef = useRef<number | null>(null);
	const eventCleanupRef = useRef(new Map<HTMLElement, () => void>());
	const detailButtonRef = useRef<HTMLButtonElement | null>(null);
	const latestActivePopoverRef = useRef<ActivePopover | null>(null);
	const latestIsPopoverPinnedRef = useRef(false);
	const popoverContentRef = useRef<HTMLDivElement | null>(null);
	const shouldFocusPopoverRef = useRef(false);
	const [activePopover, setActivePopover] = useState<ActivePopover | null>(
		null,
	);
	const [isPopoverPinned, setIsPopoverPinned] = useState(false);
	const [title, setTitle] = useState("");
	const { calendarShellRef, registerEventSegment, unregisterEventSegment } =
		useOrdersCalendarDayGridGeometry({ timezone });

	const ordersById = new Map(orders.map((order) => [order.id, order]));
	const activeOrder = activePopover
		? (ordersById.get(activePopover.eventId) ?? null)
		: null;
	const visibleActivePopover = activeOrder ? activePopover : null;
	const visibleIsPopoverPinned = visibleActivePopover ? isPopoverPinned : false;

	latestActivePopoverRef.current = visibleActivePopover;
	latestIsPopoverPinnedRef.current = visibleIsPopoverPinned;

	function clearCloseTimeout() {
		if (closeTimeoutRef.current !== null) {
			window.clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
	}

	function closePopover() {
		clearCloseTimeout();
		shouldFocusPopoverRef.current = false;
		setIsPopoverPinned(false);
		setActivePopover(null);
	}

	function setPopover(eventId: string, anchorEl: HTMLElement, pinned: boolean) {
		clearCloseTimeout();
		setIsPopoverPinned(pinned);
		setActivePopover((current) => {
			if (
				current &&
				current.eventId === eventId &&
				current.anchorEl === anchorEl
			) {
				return current;
			}

			return {
				eventId,
				anchorEl,
			};
		});
	}

	function openHoverPopover(eventId: string, anchorEl: HTMLElement) {
		if (
			latestIsPopoverPinnedRef.current &&
			latestActivePopoverRef.current?.eventId !== eventId
		) {
			return;
		}

		shouldFocusPopoverRef.current = false;
		setPopover(eventId, anchorEl, latestIsPopoverPinnedRef.current);
	}

	function openPinnedPopover(
		eventId: string,
		anchorEl: HTMLElement,
		options?: {
			focusContent?: boolean;
		},
	) {
		shouldFocusPopoverRef.current = options?.focusContent ?? false;
		setPopover(eventId, anchorEl, true);
	}

	function scheduleClose(eventId: string) {
		if (latestIsPopoverPinnedRef.current) {
			return;
		}

		clearCloseTimeout();
		closeTimeoutRef.current = window.setTimeout(() => {
			setActivePopover((current) =>
				current?.eventId === eventId ? null : current,
			);
			closeTimeoutRef.current = null;
		}, 120);
	}

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

	function handleEventMouseEnter(arg: EventHoveringArg) {
		openHoverPopover(arg.event.id, arg.el as HTMLElement);
	}

	function handleEventMouseLeave(arg: EventHoveringArg) {
		scheduleClose(arg.event.id);
	}

	function handleEventClick(arg: EventClickArg) {
		arg.jsEvent.preventDefault();
		arg.jsEvent.stopPropagation();

		if (
			latestIsPopoverPinnedRef.current &&
			latestActivePopoverRef.current?.eventId === arg.event.id
		) {
			closePopover();
			return;
		}

		openPinnedPopover(arg.event.id, arg.el as HTMLElement);
	}

	function handleEventDidMount(arg: EventMountArg) {
		arg.el.tabIndex = 0;
		arg.el.setAttribute("role", "button");
		arg.el.setAttribute("aria-haspopup", "dialog");

		const handleFocus = () => {
			openHoverPopover(arg.event.id, arg.el);
		};

		const handleBlur = (event: FocusEvent) => {
			const nextFocusedElement = event.relatedTarget;
			if (
				nextFocusedElement instanceof Node &&
				popoverContentRef.current?.contains(nextFocusedElement)
			) {
				return;
			}

			scheduleClose(arg.event.id);
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Enter" && event.key !== " ") {
				return;
			}

			event.preventDefault();
			event.stopPropagation();

			if (
				latestIsPopoverPinnedRef.current &&
				latestActivePopoverRef.current?.eventId === arg.event.id
			) {
				closePopover();
				return;
			}

			openPinnedPopover(arg.event.id, arg.el, { focusContent: true });
		};

		arg.el.addEventListener("focus", handleFocus);
		arg.el.addEventListener("blur", handleBlur);
		arg.el.addEventListener("keydown", handleKeyDown);

		eventCleanupRef.current.set(arg.el, () => {
			arg.el.removeEventListener("focus", handleFocus);
			arg.el.removeEventListener("blur", handleBlur);
			arg.el.removeEventListener("keydown", handleKeyDown);
		});
		registerEventSegment(arg);
	}

	function handleEventWillUnmount(arg: EventMountArg) {
		const cleanup = eventCleanupRef.current.get(arg.el);
		cleanup?.();
		eventCleanupRef.current.delete(arg.el);
		unregisterEventSegment(arg);

		setActivePopover((current) =>
			current?.anchorEl === arg.el ? null : current,
		);

		if (latestActivePopoverRef.current?.anchorEl === arg.el) {
			setIsPopoverPinned(false);
		}
	}

	function handleViewChange(nextView: OrdersCalendarView) {
		calendarRef.current?.getApi().changeView(nextView);
	}

	// biome-ignore lint: the function is used to clean up event listeners
	useEffect(() => {
		return () => {
			clearCloseTimeout();
			for (const cleanup of eventCleanupRef.current.values()) {
				cleanup();
			}
			eventCleanupRef.current.clear();
		};
	}, []);

	useEffect(() => {
		if (
			!visibleActivePopover ||
			!visibleIsPopoverPinned ||
			!shouldFocusPopoverRef.current
		) {
			return;
		}

		detailButtonRef.current?.focus();
		shouldFocusPopoverRef.current = false;
	}, [visibleActivePopover, visibleIsPopoverPinned]);

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
						eventMouseEnter={handleEventMouseEnter}
						eventMouseLeave={handleEventMouseLeave}
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

					{visibleActivePopover && activeOrder ? (
						<OrdersCalendarPopover
							anchorEl={visibleActivePopover.anchorEl}
							contentRef={popoverContentRef}
							detailButtonRef={detailButtonRef}
							isPinned={visibleIsPopoverPinned}
							onClose={closePopover}
							onHoverEnd={() => scheduleClose(visibleActivePopover.eventId)}
							onHoverStart={clearCloseTimeout}
							onOrderClick={() => {
								closePopover();
								onOrderClick(activeOrder.id);
							}}
							order={activeOrder}
							timezone={timezone}
						/>
					) : null}
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

function OrdersCalendarPopover({
	anchorEl,
	contentRef,
	detailButtonRef,
	isPinned,
	onClose,
	onHoverEnd,
	onHoverStart,
	onOrderClick,
	order,
	timezone,
}: {
	anchorEl: HTMLElement;
	contentRef: React.RefObject<HTMLDivElement | null>;
	detailButtonRef: React.RefObject<HTMLButtonElement | null>;
	isPinned: boolean;
	onClose: () => void;
	onHoverEnd: () => void;
	onHoverStart: () => void;
	onOrderClick: () => void;
	order: ParsedRentalsCalendarItem;
	timezone: string;
}) {
	const statusPresentation = getRentalOrderStatusPresentation(order, dayjs());

	return (
		<Popover open onOpenChange={(open) => !open && onClose()}>
			<PopoverContent
				ref={contentRef}
				anchor={anchorEl}
				side="bottom"
				align="center"
				sideOffset={10}
				className="orders-calendar-popover w-[18rem] gap-0 rounded-2xl border border-neutral-200 bg-white p-0 shadow-[0_16px_48px_rgba(15,23,42,0.14)]"
				onBlurCapture={(event) => {
					const nextFocusedElement = event.relatedTarget;
					if (
						nextFocusedElement instanceof Node &&
						(contentRef.current?.contains(nextFocusedElement) ||
							anchorEl.contains(nextFocusedElement))
					) {
						return;
					}

					onClose();
				}}
				onMouseEnter={onHoverStart}
				onMouseLeave={() => {
					if (!isPinned) {
						onHoverEnd();
					}
				}}
			>
				<div className="space-y-4 p-4">
					<div className="space-y-2">
						<p
							className={cn(
								"font-mono text-sm font-semibold",
								statusPresentation.headingClassName,
							)}
						>
							#{formatOrderNumber(order.rentalNumber)}
						</p>
						<div className="flex items-center gap-2 text-[15px] text-neutral-800">
							<CircleUserRound className="size-4 text-neutral-400" />
							<span className="truncate">
								{order.customer?.displayName ?? "Cliente sin nombre"}
							</span>
						</div>
					</div>

					<div className="space-y-3 text-sm">
						<DetailRow
							label="Retiro"
							value={formatOrdersCalendarTooltipDateTime(
								order.pickupAt,
								timezone,
							)}
						/>
						<DetailRow
							label="Devolución"
							value={formatOrdersCalendarTooltipDateTime(
								order.returnAt,
								timezone,
							)}
						/>
						<div className="grid grid-cols-[96px_1fr] items-center gap-3">
							<span className="text-neutral-500">Estado</span>
							<div className="flex items-center gap-2 font-medium text-neutral-700">
								<span
									className={cn(
										"size-2.5 rounded-full",
										statusPresentation.dotClassName,
									)}
								/>
								<span>{statusPresentation.label}</span>
							</div>
						</div>
					</div>
				</div>

				<div className="border-t border-neutral-200 px-4 py-3">
					<button
						ref={detailButtonRef}
						type="button"
						className="flex w-full items-center justify-between text-left text-[15px] font-medium text-neutral-800 transition-colors hover:text-neutral-950"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							onOrderClick();
						}}
					>
						<span>Ver detalle del pedido</span>
						<ChevronRight className="size-4 text-neutral-400" />
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="grid grid-cols-[96px_1fr] items-center gap-3">
			<span className="text-neutral-500">{label}</span>
			<span className="font-medium text-neutral-800">{value}</span>
		</div>
	);
}
