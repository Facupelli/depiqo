import type { ProductTimelineBlock } from "@repo/schemas";
import dayjs from "@/lib/dates/dayjs";

export type TimelinePreset = "day" | "week" | "2weeks";

export interface TimelineRange {
	from: string;
	to: string;
	timezone: string;
	preset: TimelinePreset;
}

export interface TimelineTick {
	key: string;
	position: number;
	label: string;
	secondaryLabel?: string;
	isMajor: boolean;
}

export interface TimelineBlockLayout {
	left: number;
	width: number;
	isClippedStart: boolean;
	isClippedEnd: boolean;
}

export const TIMELINE_ASSET_COLUMN_WIDTH = 248;

const PRESET_DAYS: Record<TimelinePreset, number> = {
	day: 1,
	week: 7,
	"2weeks": 14,
};

export function resolveTimelineRange(params: {
	preset: TimelinePreset;
	timezone: string;
	from?: string;
	to?: string;
}): TimelineRange {
	const { preset, timezone, from, to } = params;

	if (from && to) {
		const fromDate = dayjs(from);
		const toDate = dayjs(to);

		if (fromDate.isValid() && toDate.isValid() && fromDate.isBefore(toDate)) {
			return {
				from,
				to,
				timezone,
				preset,
			};
		}
	}

	return getDefaultTimelineRange({ preset, timezone });
}

export function getDefaultTimelineRange(params: {
	preset: TimelinePreset;
	timezone: string;
}): TimelineRange {
	const { preset, timezone } = params;
	const start = dayjs().tz(timezone).startOf("day");
	const end = start.add(PRESET_DAYS[preset], "day");

	return {
		from: start.toISOString(),
		to: end.toISOString(),
		timezone,
		preset,
	};
}

export function shiftTimelineRange(
	range: TimelineRange,
	direction: -1 | 1,
): TimelineRange {
	const start = dayjs(range.from);
	const end = dayjs(range.to);
	const durationMs = end.diff(start, "millisecond");

	return {
		...range,
		from: start.add(durationMs * direction, "millisecond").toISOString(),
		to: end.add(durationMs * direction, "millisecond").toISOString(),
	};
}

export function getTimelineCanvasMinWidth(preset: TimelinePreset) {
	if (preset === "day") {
		return 1200;
	}

	if (preset === "2weeks") {
		return 1680;
	}

	return 1080;
}

export function getTimelineTicks(range: TimelineRange): TimelineTick[] {
	const start = dayjs(range.from).tz(range.timezone);
	const end = dayjs(range.to).tz(range.timezone);
	const ticks: TimelineTick[] = [];

	if (range.preset === "day") {
		for (let hour = 0; hour < 24; hour += 1) {
			const tickAt = start.add(hour, "hour");

			if (!tickAt.isBefore(end)) {
				break;
			}

			ticks.push({
				key: tickAt.toISOString(),
				position: getRelativePosition(tickAt.toISOString(), range),
				label: tickAt.format("HH:mm"),
				secondaryLabel: hour === 0 ? tickAt.format("ddd D MMM") : undefined,
				isMajor: hour % 6 === 0,
			});
		}

		return ticks;
	}

	const totalDays = PRESET_DAYS[range.preset];
	for (let day = 0; day < totalDays; day += 1) {
		const tickAt = start.add(day, "day");

		if (!tickAt.isBefore(end)) {
			break;
		}

		ticks.push({
			key: tickAt.toISOString(),
			position: getRelativePosition(tickAt.toISOString(), range),
			label: tickAt.format("ddd"),
			secondaryLabel: tickAt.format("D MMM"),
			isMajor: true,
		});
	}

	return ticks;
}

export function getRelativePosition(timestamp: string, range: TimelineRange) {
	const total = getRangeDurationMs(range);
	const offset = dayjs(timestamp).valueOf() - dayjs(range.from).valueOf();

	if (total <= 0) {
		return 0;
	}

	return (offset / total) * 100;
}

export function getRangeDurationMs(range: TimelineRange) {
	return dayjs(range.to).valueOf() - dayjs(range.from).valueOf();
}

export function getBlockLayout(
	block: ProductTimelineBlock,
	range: TimelineRange,
): TimelineBlockLayout | null {
	const rangeStart = dayjs(range.from).valueOf();
	const rangeEnd = dayjs(range.to).valueOf();
	const blockStart = dayjs(block.startsAt).valueOf();
	const blockEnd = dayjs(block.endsAt).valueOf();

	if (blockEnd <= rangeStart || blockStart >= rangeEnd) {
		return null;
	}

	const clippedStart = Math.max(blockStart, rangeStart);
	const clippedEnd = Math.min(blockEnd, rangeEnd);
	const duration = rangeEnd - rangeStart;

	if (duration <= 0 || clippedEnd <= clippedStart) {
		return null;
	}

	const minWidthPercent = range.preset === "day" ? 1.2 : 0.8;

	return {
		left: ((clippedStart - rangeStart) / duration) * 100,
		width: Math.max(
			((clippedEnd - clippedStart) / duration) * 100,
			minWidthPercent,
		),
		isClippedStart: blockStart < rangeStart,
		isClippedEnd: blockEnd > rangeEnd,
	};
}

export function formatTimelineRangeLabel(range: TimelineRange) {
	const start = dayjs(range.from).tz(range.timezone);
	const end = dayjs(range.to).tz(range.timezone);

	if (range.preset === "day") {
		return start.format("dddd D [de] MMMM [de] YYYY");
	}

	return `${start.format("D MMM")} - ${end.subtract(1, "day").format("D MMM YYYY")}`;
}

export function formatBlockDateTime(value: string, timezone: string) {
	return dayjs(value).tz(timezone).format("D MMM YYYY, HH:mm");
}
