import type {
	AssetOccupancySpanDto,
	GetAssetAvailabilityTimelineResponseDto,
} from "@repo/api-contracts";
import {
	addDaysToLocalDate,
	localDateStartInstant,
	resolveLocalDateTime,
} from "@repo/temporal";
import dayjs from "@/lib/dates/dayjs";

export type TimelineRow =
	GetAssetAvailabilityTimelineResponseDto["data"][number];
export type TimelineWeek = { from: string; to: string };

export const firstTimelineDate = "0001-01-01";
export const lastTimelineDate = "9999-12-26";

export function isTimelineDate(date: string): boolean {
	return date >= firstTimelineDate && date <= lastTimelineDate;
}

export function getBranchToday(timezone: string): string {
	return dayjs().tz(timezone).format("YYYY-MM-DD");
}

export function getTimelineWeek(date: string): TimelineWeek {
	const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
	const from = addDaysToLocalDate(date, -((weekday + 6) % 7));
	return { from, to: addDaysToLocalDate(from, 6) };
}

export function formatTimelineDate(date: string, format: string): string {
	return dayjs.utc(new Date(`${date}T00:00:00Z`)).format(format);
}

export function getTimelineAxis(
	week: TimelineWeek,
	{
		timezone,
		window,
	}: Pick<GetAssetAvailabilityTimelineResponseDto, "timezone" | "window">,
) {
	const start = Date.parse(window.startsAt);
	const end = Date.parse(window.endsAt);
	const duration = end - start;

	function position(instant: number) {
		return (100 * (instant - start)) / duration;
	}

	const days = Array.from({ length: 7 }, (_, index) => {
		const date = addDaysToLocalDate(week.from, index);
		return {
			date,
			start:
				index === 0 ? start : localDateStartInstant(date, timezone).getTime(),
		};
	}).flatMap(({ date, start: dayStart }, index, boundaries) => {
		const left = Math.max(start, dayStart);
		const right = Math.min(end, boundaries[index + 1]?.start ?? end);
		if (right <= left) return [];
		const noon = resolveLocalDateTime({
			localDate: date,
			minuteOfDay: 720,
			timeZone: timezone,
		});
		const noonMs = noon.kind === "resolved" ? noon.instant.getTime() : null;
		return [
			{
				date,
				left: position(left),
				width: position(right) - position(left),
				noon:
					noonMs !== null && noonMs > left && noonMs < right
						? (100 * (noonMs - left)) / (right - left)
						: null,
			},
		];
	});

	function place(span: AssetOccupancySpanDto) {
		const left = Math.max(start, Date.parse(span.startsAt));
		const right = Math.min(end, Date.parse(span.endsAt));
		return right > left
			? { left: position(left), width: position(right) - position(left) }
			: null;
	}

	return { days, place };
}

export function groupTimelineRows(rows: TimelineRow[]) {
	const groups = new Map<
		string,
		{ equipmentType: TimelineRow["equipmentType"]; units: TimelineRow[] }
	>();
	for (const row of rows) {
		const group = groups.get(row.equipmentType.id);
		if (group) group.units.push(row);
		else
			groups.set(row.equipmentType.id, {
				equipmentType: row.equipmentType,
				units: [row],
			});
	}
	return [...groups.values()];
}

export function timelineSpanKey(span: AssetOccupancySpanDto) {
	return `${span.blockId}:${span.kind}:${span.startsAt}:${span.endsAt}`;
}

export function getUnitLabel(serialNumber: string | null, id: string): string {
	return serialNumber?.trim() || `Sin serie · ${id.slice(-8)}`;
}
