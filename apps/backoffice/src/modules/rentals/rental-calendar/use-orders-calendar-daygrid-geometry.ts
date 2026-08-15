import type { EventMountArg } from "@fullcalendar/core";
import { useCallback, useEffect, useRef } from "react";
import {
	getOrdersCalendarEventGeometry,
	getOrdersCalendarEventOrder,
} from "./orders-calendar.utils";

type MountedEventSegment = {
	el: HTMLElement;
	event: EventMountArg["event"];
	isStart: boolean;
	isEnd: boolean;
};

type UseOrdersCalendarDayGridGeometryOptions = {
	timezone: string;
};

export function useOrdersCalendarDayGridGeometry({
	timezone,
}: UseOrdersCalendarDayGridGeometryOptions) {
	const shellRef = useRef<HTMLDivElement | null>(null);
	const timezoneRef = useRef(timezone);
	const resizeObserverRef = useRef<ResizeObserver | null>(null);
	const geometryFrameRef = useRef<number | null>(null);
	const mountedSegmentsRef = useRef(
		new Map<HTMLElement, MountedEventSegment>(),
	);

	timezoneRef.current = timezone;

	const clearEventGeometry = useCallback((el: HTMLElement) => {
		el.style.marginInlineStart = "";
		el.style.marginInlineEnd = "";
	}, []);

	const getDayEventLane = useCallback((date: string): DOMRect | null => {
		const lane = shellRef.current?.querySelector<HTMLElement>(
			`.fc-daygrid-day[data-date="${date}"] .fc-daygrid-day-events`,
		);
		return lane?.getBoundingClientRect() ?? null;
	}, []);

	const applyEventGeometry = useCallback(() => {
		for (const segment of mountedSegmentsRef.current.values()) {
			clearEventGeometry(segment.el);
		}

		for (const segment of mountedSegmentsRef.current.values()) {
			const order = getOrdersCalendarEventOrder(segment.event);
			const geometry = getOrdersCalendarEventGeometry(
				order,
				timezoneRef.current,
			);
			const startLane = segment.isStart
				? getDayEventLane(geometry.startDate)
				: null;
			const endLane = segment.isEnd
				? getDayEventLane(geometry.finalOccupiedDate)
				: null;

			if (!startLane && !endLane) {
				continue;
			}

			const startMargin = startLane
				? getComputedMargin(segment.el, "marginInlineStart")
				: 0;
			const endMargin = endLane
				? getComputedMargin(segment.el, "marginInlineEnd")
				: 0;
			const usableStartWidth = startLane
				? Math.max(
						0,
						startLane.width - startMargin - (segment.isEnd ? endMargin : 0),
					)
				: 0;
			const usableEndWidth = endLane
				? Math.max(
						0,
						endLane.width - endMargin - (segment.isStart ? startMargin : 0),
					)
				: 0;

			if (startLane && geometry.startFraction > 0) {
				segment.el.style.marginInlineStart = `${startMargin + geometry.startFraction * usableStartWidth}px`;
			}

			if (endLane && geometry.finalFraction < 1) {
				segment.el.style.marginInlineEnd = `${endMargin + (1 - geometry.finalFraction) * usableEndWidth}px`;
			}
		}
	}, [clearEventGeometry, getDayEventLane]);

	const scheduleEventGeometry = useCallback(() => {
		if (geometryFrameRef.current !== null) {
			cancelAnimationFrame(geometryFrameRef.current);
		}

		// FullCalendar completes DayGrid segment placement after mount hooks run.
		// Defer two frames so lane rectangles and segment widths are final.
		geometryFrameRef.current = requestAnimationFrame(() => {
			geometryFrameRef.current = requestAnimationFrame(() => {
				geometryFrameRef.current = null;
				applyEventGeometry();
			});
		});
	}, [applyEventGeometry]);

	const calendarShellRef = useCallback(
		(shell: HTMLDivElement | null) => {
			resizeObserverRef.current?.disconnect();
			resizeObserverRef.current = null;
			shellRef.current = shell;

			if (!shell) {
				for (const segment of mountedSegmentsRef.current.values()) {
					clearEventGeometry(segment.el);
				}
				return;
			}

			const resizeObserver = new ResizeObserver(scheduleEventGeometry);
			resizeObserver.observe(shell);
			resizeObserverRef.current = resizeObserver;
			scheduleEventGeometry();
		},
		[clearEventGeometry, scheduleEventGeometry],
	);

	const registerEventSegment = useCallback(
		(arg: EventMountArg) => {
			mountedSegmentsRef.current.set(arg.el, {
				el: arg.el,
				event: arg.event,
				isStart: arg.isStart,
				isEnd: arg.isEnd,
			});
			scheduleEventGeometry();
		},
		[scheduleEventGeometry],
	);

	const unregisterEventSegment = useCallback(
		(arg: EventMountArg) => {
			clearEventGeometry(arg.el);
			mountedSegmentsRef.current.delete(arg.el);
			scheduleEventGeometry();
		},
		[clearEventGeometry, scheduleEventGeometry],
	);

	// Run after every render so a changed operational timezone recomputes the
	// mounted segments. Scheduling coalesces this with other layout invalidations.
	useEffect(scheduleEventGeometry);

	useEffect(() => {
		return () => {
			resizeObserverRef.current?.disconnect();
			if (geometryFrameRef.current !== null) {
				cancelAnimationFrame(geometryFrameRef.current);
			}
			for (const segment of mountedSegmentsRef.current.values()) {
				clearEventGeometry(segment.el);
			}
			mountedSegmentsRef.current.clear();
		};
	}, [clearEventGeometry]);

	return {
		calendarShellRef,
		registerEventSegment,
		unregisterEventSegment,
	};
}

function getComputedMargin(
	el: HTMLElement,
	property: "marginInlineStart" | "marginInlineEnd",
): number {
	return Number.parseFloat(getComputedStyle(el)[property]) || 0;
}
