import type { Dayjs } from "dayjs";
import dayjs from "./dayjs";

export function nowUtc(): Dayjs {
	return dayjs.utc();
}

/**
 * Convert a native Date object to a dayjs UTC instance.
 * Use at layer boundaries where external sources produce a native timestamp.
 *
 * This is the only legitimate entry point for native Date objects.
 * Never call dayjs(date) directly outside of this file.
 */
export function fromDate(date: Date): Dayjs {
	return dayjs.utc(date);
}

/** Parse a daily rental bound from a plain YYYY-MM-DD string. */
export function fromDateParam(date: string): Dayjs {
	return dayjs.utc(`${date}T00:00:00Z`);
}

/** Convert a plain YYYY-MM-DD string into a local Date for calendar widgets. */
export function dateParamToLocalDate(date: string): Date {
	const [year, month, day] = date.split("-").map(Number);
	return new Date(year, month - 1, day);
}

/** Convert a calendar Date into a plain YYYY-MM-DD string. */
export function localDateToDateParam(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

/** Serialize a dayjs instance to a UTC ISO string for DB/API transport. */
export function toISOString(date: Dayjs): string {
	return date.utc().toISOString();
}

/** Serialize a daily rental bound to "YYYY-MM-DD" for API transport. */
export function toDateParam(date: Dayjs): string {
	return date.utc().format("YYYY-MM-DD");
}

/**
 * Serialize a daily rental bound back to a plain date string.
 * Use when sending to the client — prevents timezone leakage.
 */
export function toDateString(date: Dayjs): string {
	return date.utc().format("YYYY-MM-DD");
}

/**
 * Parse a UTC ISO timestamp from the DB or API.
 * Use for: created_at, paid_at, cancelled_at,
 *          and tstzrange bounds of HOURLY rentals.
 */
export function parseTimestamp(
	value: string | null | undefined | Date,
): Dayjs | null {
	if (!value) {
		return null;
	}
	const parsed = dayjs.utc(value);
	return parsed.isValid() ? parsed : null;
}

/**
 * Parse a tstzrange bound that represents a DAILY rental.
 * The time component is ignored — only the date matters.
 * Stored as UTC midnight; we read back the date portion only.
 */
export function parseDailyBound(
	value: string | null | undefined,
): Dayjs | null {
	if (!value) {
		return null;
	}
	const parsed = dayjs.utc(value).startOf("day");
	return parsed.isValid() ? parsed : null;
}
