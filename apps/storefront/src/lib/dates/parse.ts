import type { Dayjs } from "dayjs";
import dayjs from "./dayjs";

export function nowUtc(): Dayjs {
	return dayjs.utc();
}

export function getTodayInTimezone(timezone: string): string {
	return nowUtc().tz(timezone).format("YYYY-MM-DD");
}

export function fromDate(date: Date): Dayjs {
	return dayjs.utc(date);
}

export function fromDateParam(date: string): Dayjs {
	return dayjs.utc(`${date}T00:00:00Z`);
}

export function dateParamToLocalDate(date: string): Date {
	const [year, month, day] = date.split("-").map(Number);
	return new Date(year, month - 1, day);
}

export function localDateToDateParam(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

export function toISOString(date: Dayjs): string {
	return date.utc().toISOString();
}

export function toDateParam(date: Dayjs): string {
	return date.utc().format("YYYY-MM-DD");
}

export function toDateString(date: Dayjs): string {
	return date.utc().format("YYYY-MM-DD");
}

export function parseTimestamp(
	value: string | null | undefined | Date,
): Dayjs | null {
	if (!value) {
		return null;
	}
	const parsed = dayjs.utc(value);
	return parsed.isValid() ? parsed : null;
}

export function parseDailyBound(
	value: string | null | undefined,
): Dayjs | null {
	if (!value) {
		return null;
	}
	const parsed = dayjs.utc(value).startOf("day");
	return parsed.isValid() ? parsed : null;
}
