import type { Dayjs } from "dayjs";
import dayjs from "./dayjs";

export function formatDate(date: Dayjs | null): string {
	if (!date) return "—";
	return date.utc().format("MMMM D, YYYY");
}

export function formatTimestampInTimezone(
	value: string | Date | Dayjs,
	timezone: string,
	format: string,
): string {
	return dayjs.utc(value).tz(timezone).format(format);
}
