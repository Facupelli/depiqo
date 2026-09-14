import { resolveLocalDateTime } from "@repo/temporal";
import dayjs from "@/lib/dates/dayjs";

export type RentalPeriodValue = {
	startDate: string;
	startTime: number;
	endDate: string;
	endTime: number;
};

export type ResolvedRentalPeriod = {
	start: Date;
	end: Date;
};

export type RentalPeriodResolution =
	| { kind: "resolved"; period: ResolvedRentalPeriod }
	| { kind: "nonexistent"; endpoint: "start" | "end" };

export function dateParamToLocalDate(date: string): Date | undefined {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;

	const [year, month, day] = date.split("-").map(Number);
	const result = new Date(year, month - 1, day);
	if (
		result.getFullYear() !== year ||
		result.getMonth() !== month - 1 ||
		result.getDate() !== day
	) {
		return undefined;
	}

	return result;
}

export function localDateToDateParam(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function minuteOfDayToTime(value: number): string {
	const hour = Math.floor(value / 60);
	const minute = value % 60;
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function timeToMinuteOfDay(value: string): number | null {
	const match = /^(\d{2}):(\d{2})$/.exec(value);
	if (!match) return null;

	const hour = Number(match[1]);
	const minute = Number(match[2]);
	if (hour > 23 || minute > 59) return null;

	return hour * 60 + minute;
}

export function hydrateRentalPeriod(
	startInstant: string | Date,
	endInstant: string | Date,
	timeZone: string,
): RentalPeriodValue {
	const start = toLocalPeriodEndpoint(startInstant, timeZone);
	const end = toLocalPeriodEndpoint(endInstant, timeZone);

	return {
		startDate: start.date,
		startTime: start.minuteOfDay,
		endDate: end.date,
		endTime: end.minuteOfDay,
	};
}

export function resolveRentalPeriodEndpoint(
	localDate: string,
	minuteOfDay: number,
	timeZone: string,
) {
	return resolveLocalDateTime({ localDate, minuteOfDay, timeZone });
}

export function resolveRentalPeriod(
	value: RentalPeriodValue,
	timeZone: string,
): RentalPeriodResolution {
	const start = resolveRentalPeriodEndpoint(
		value.startDate,
		value.startTime,
		timeZone,
	);
	if (start.kind === "nonexistent") {
		return { kind: "nonexistent", endpoint: "start" };
	}

	const end = resolveRentalPeriodEndpoint(
		value.endDate,
		value.endTime,
		timeZone,
	);
	if (end.kind === "nonexistent") {
		return { kind: "nonexistent", endpoint: "end" };
	}

	return {
		kind: "resolved",
		period: { start: start.instant, end: end.instant },
	};
}

export function isRentalPeriodChronological({
	start,
	end,
}: ResolvedRentalPeriod): boolean {
	return end.getTime() > start.getTime();
}

function toLocalPeriodEndpoint(instant: string | Date, timeZone: string) {
	const local = dayjs(instant).tz(timeZone);

	return {
		date: local.format("YYYY-MM-DD"),
		minuteOfDay: local.hour() * 60 + local.minute(),
	};
}
